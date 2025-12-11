import { Request, Response } from "express";
import * as reportService from "../services/reportService";

export const getCombinedReport = async (req: Request, res: Response) => {
    try {
        const report = await reportService.getCombinedReport(req.query);
        res.json(report);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const exportReport = async (req: Request, res: Response) => {
    try {
        const format = req.query.format as 'csv' | 'pdf';
        if (!format || !['csv', 'pdf'].includes(format)) {
            return res.status(400).json({ error: 'Invalid format specified.' });
        }
        const reportData = await reportService.getCombinedReport(req.query);
        const file = await reportService.generateReportFile(format, reportData);

        res.setHeader('Content-Type', file.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="report-${Date.now()}.${format}"`);
        res.send(file.content);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};