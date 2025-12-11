import prisma from "../config/prisma";

// Create a new room
export const createRoom = async (block: string, roomNumber: string, capacity: number) => {
  const existingRoom = await prisma.room.findFirst({
    where: { block, roomNumber }
  });

  if (existingRoom) {
    throw new Error("Room already exists in this block");
  }

  const room = await prisma.room.create({
    data: { block, roomNumber, capacity }
  });

  return room;
};

// Get all rooms with occupancy info
export const getAllRooms = async () => {
  const rooms = await prisma.room.findMany({
    orderBy: [
      { block: 'asc' },
      { roomNumber: 'asc' },
    ],
    include: {
      allocations: {
        include: { student: true }
      }
    }
  });

  // Map to the structure expected by the frontend
  return rooms.map(room => ({
    ...room,
    occupiedCapacity: room.allocations.length,
    availableCapacity: room.capacity - room.allocations.length,
    // Map allocations to include student details directly
    allocations: room.allocations.map(alloc => ({
        id: alloc.student.id,
        // firstname and lastname to create name
        name: alloc.student.firstname + " " + alloc.student.lastname,
        matricNumber: alloc.student.matricNumber,
    }))
  }));
};

// Update room details
export const updateRoom = async (roomId: number, data: { block?: string; roomNumber?: string; capacity?: number }) => {
  const room = await prisma.room.update({
    where: { id: roomId },
    data,
    include: { allocations: true }
  });

  return room;
};

// Delete room (only if no allocations)
export const deleteRoom = async (roomId: number) => {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { allocations: true }
  });

  if (!room) throw new Error("Room not found");

  if (room.allocations.length > 0) {
    throw new Error("Cannot delete room with existing allocations");
  }

  await prisma.room.delete({ where: { id: roomId } });
  return { message: "Room deleted successfully" };
};

// Get overall room availability summary
export const getRoomSummary = async () => {
  const totalRooms = await prisma.room.count();
  const totalCapacityResult = await prisma.room.aggregate({
    _sum: { capacity: true }
  });
  const totalAllocations = await prisma.allocation.count();

  const totalCapacity = totalCapacityResult._sum.capacity || 0;

  return {
    totalRooms,
    totalCapacity: totalCapacity,
    totalAllocated: totalAllocations,
    availableSpaces: totalCapacity - totalAllocations
  };
  
};

// Get summary for each block
export const getBlockSummary = async () => {
    const rooms = await prisma.room.findMany({
        include: {
            _count: {
                select: { allocations: true }
            }
        }
    });

    const blockData: { [key: string]: { totalRooms: number; totalCapacity: number; occupiedCapacity: number } } = {};

    rooms.forEach(room => {
        if (!blockData[room.block]) {
            blockData[room.block] = { totalRooms: 0, totalCapacity: 0, occupiedCapacity: 0 };
        }
        blockData[room.block].totalRooms += 1;
        blockData[room.block].totalCapacity += room.capacity;
        blockData[room.block].occupiedCapacity += room._count.allocations;
    });
    
    // Convert to array format for the frontend
    return Object.keys(blockData).map(blockName => ({
        name: blockName,
        ...blockData[blockName],
        availableCapacity: blockData[blockName].totalCapacity - blockData[blockName].occupiedCapacity
    })).sort((a, b) => a.name.localeCompare(b.name));
};