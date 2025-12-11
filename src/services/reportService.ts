import prisma from "../config/prisma";
import { subDays, startOfDay, endOfDay, format, startOfMonth } from 'date-fns';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';

interface ReportFilters {
    period?: string;
    level?: string;
    block?: string;
    startDate?: string;
    endDate?: string;
}

const getDateRange = (filters: ReportFilters) => {
    let startDate: Date | undefined;
    let endDate: Date | undefined = endOfDay(new Date());

    if (filters.period === 'custom' && filters.startDate) {
        startDate = startOfDay(new Date(filters.startDate));
        if (filters.endDate) {
            endDate = endOfDay(new Date(filters.endDate));
        }
    } else if (filters.period !== 'all') {
        const periodMap: { [key: string]: number } = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
        if (filters.period && periodMap[filters.period]) {
            startDate = startOfDay(subDays(new Date(), periodMap[filters.period]));
        }
    }
    return { startDate, endDate };
};

export const getCombinedReport = async (filters: ReportFilters) => {
    const { startDate, endDate } = getDateRange(filters);

    const registrationWhere: any = { status: { notIn: ['draft'] } };
    const studentWhere: any = {};
    const allocationWhere: any = {};
    const roomWhere: any = {};

    if (startDate && endDate) {
        registrationWhere.createdAt = { gte: startDate, lte: endDate };
        allocationWhere.allocatedAt = { gte: startDate, lte: endDate };
    }
    if (filters.level && filters.level !== 'all') {
        studentWhere.level = parseInt(filters.level, 10);
    }
    if (filters.block && filters.block !== 'all') {
        roomWhere.block = filters.block;
    }
    
    const rooms = await prisma.room.findMany({
        where: roomWhere,
        include: { 
            _count: { select: { allocations: { where: allocationWhere } } },
            allocations: { where: allocationWhere }
        }
    });

    const blockOccupancyMap: { [key: string]: { totalRooms: number; occupiedRooms: number; capacity: number; allocated: number; } } = {};
    for (const room of rooms) {
        if (!blockOccupancyMap[room.block]) {
            blockOccupancyMap[room.block] = { totalRooms: 0, occupiedRooms: 0, capacity: 0, allocated: 0 };
        }
        blockOccupancyMap[room.block].totalRooms++;
        blockOccupancyMap[room.block].capacity += room.capacity;
        if (room.allocations.length > 0) blockOccupancyMap[room.block].occupiedRooms++;
        blockOccupancyMap[room.block].allocated += room._count.allocations;
    }
    const roomOccupancy = Object.entries(blockOccupancyMap).map(([block, data]) => ({
        block, ...data,
        availableRooms: data.totalRooms - data.occupiedRooms,
        occupancyRate: data.totalRooms > 0 ? (data.occupiedRooms / data.totalRooms) * 100 : 0,
    }));
    const allocationSummary = Object.entries(blockOccupancyMap).map(([block, data]) => ({
        block, allocated: data.allocated, capacity: data.capacity,
    }));

    const studentsByLevel = await prisma.student.groupBy({
        by: ['level'],
        where: { ...studentWhere, registration: registrationWhere },
        _count: { _all: true },
        orderBy: { level: 'asc' }
    });
    const totalStudents = studentsByLevel.reduce((sum, item) => sum + item._count._all, 0);
    const levelDistribution = studentsByLevel.map(item => ({
        level: item.level.toString(), count: item._count._all,
        percentage: totalStudents > 0 ? parseFloat(((item._count._all / totalStudents) * 100).toFixed(1)) : 0
    }));

    const trends = await prisma.hostelRegistration.findMany({
        where: { ...registrationWhere, student: studentWhere },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: 'asc' }
    });
    const trendMap: { [key: string]: { date: string; pending: number; approved: number; rejected: number; total: number; } } = {};
    trends.forEach(reg => {
        const date = format(new Date(reg.createdAt), 'yyyy-MM-dd');
        if (!trendMap[date]) trendMap[date] = { date, pending: 0, approved: 0, rejected: 0, total: 0 };
        trendMap[date].total++;
        if (reg.status === 'submitted') trendMap[date].pending++;
        if (reg.status === 'approved') trendMap[date].approved++;
        if (reg.status === 'rejected') trendMap[date].rejected++;
    });
    const registrationTrends = Object.values(trendMap);

    const monthlyRegistrationsData = await prisma.hostelRegistration.groupBy({ by: ['createdAt'], where: registrationWhere, _count: true });
    const monthlyAllocationsData = await prisma.allocation.groupBy({ by: ['allocatedAt'], where: allocationWhere, _count: true });
    const monthlyMap: { [key: string]: { month: string; registrations: number; allocations: number; } } = {};
    monthlyRegistrationsData.forEach(reg => {
        const month = format(startOfMonth(new Date(reg.createdAt)), 'MMM yyyy');
        if (!monthlyMap[month]) monthlyMap[month] = { month, registrations: 0, allocations: 0 };
        monthlyMap[month].registrations += reg._count;
    });
    monthlyAllocationsData.forEach(alloc => {
        const month = format(startOfMonth(new Date(alloc.allocatedAt)), 'MMM yyyy');
        if (!monthlyMap[month]) monthlyMap[month] = { month, registrations: 0, allocations: 0 };
        monthlyMap[month].allocations += alloc._count;
    });
    const monthlyRegistrations = Object.values(monthlyMap).sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    return { roomOccupancy, registrationTrends, levelDistribution, allocationSummary, monthlyRegistrations };
};

export const generateReportFile = async (format: 'csv' | 'pdf', data: any) => {
    if (format === 'csv') {
        const parser = new Parser();
        const csv = parser.parse(data.roomOccupancy);
        return { content: csv, contentType: 'text/csv' };
    }
    if (format === 'pdf') {
        return new Promise<{content: Buffer, contentType: string}>((resolve) => {
            const doc = new PDFDocument({ margin: 50 });
            const buffers: Buffer[] = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve({ content: Buffer.concat(buffers), contentType: 'application/pdf' }));
            
            doc.fontSize(18).text('Hostel Management Report', { align: 'center' }).moveDown();
            doc.fontSize(14).text('Room Occupancy by Block', { underline: true }).moveDown(0.5);
            data.roomOccupancy.forEach((block: any) => {
                doc.fontSize(10).text(`Block ${block.block}: ${block.occupiedRooms}/${block.totalRooms} rooms occupied (${block.occupancyRate.toFixed(1)}%)`);
            });
            doc.moveDown();
            doc.fontSize(14).text('Student Distribution by Level', { underline: true }).moveDown(0.5);
            data.levelDistribution.forEach((level: any) => {
                doc.fontSize(10).text(`Level ${level.level}: ${level.count} students (${level.percentage}%)`);
            });
            doc.end();
        });
    }
    throw new Error('Unsupported format');
};