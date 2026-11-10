
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const roomId = searchParams.get("roomId");

    if (!from || !to) {
      return Response.json(
        { message: "กรุณาระบุ from และ to" },
        { status: 400 }
      );
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (
      isNaN(fromDate.getTime()) ||
      isNaN(toDate.getTime()) ||
      fromDate >= toDate
    ) {
      return Response.json(
        { message: "ช่วงเวลาไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const where: {
      startTime: { gte: Date; lt: Date };
      roomId?: number;
    } = {
      startTime: {
        gte: fromDate,
        lt: toDate,
      },
    };

    if (roomId !== null) {
      const id = Number(roomId);

      if (!Number.isInteger(id) || id <= 0) {
        return Response.json(
          { message: "roomId ไม่ถูกต้อง" },
          { status: 400 }
        );
      }

      where.roomId = id;
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: { room: true },
    });

    const stats = new Map();

    for (const booking of bookings) {
      const key = booking.roomId;

      if (!stats.has(key)) {
        stats.set(key, {
          roomId: key,
          roomCode: booking.room.roomCode,
          roomName: booking.room.roomName,
          bookingCount: 0,
          totalHours: 0,
        });
      }

      const item = stats.get(key);

      item.bookingCount++;

      item.totalHours +=
        (booking.endTime.getTime() -
          booking.startTime.getTime()) /
        (1000 * 60 * 60);
    }

    return Response.json({
      message: "สรุปสถิติสำเร็จ",
      data: Array.from(stats.values()),
    });

  } catch (error) {
    return Response.json(
      { message: "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
