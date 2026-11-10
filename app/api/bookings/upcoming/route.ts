
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const days = Number(searchParams.get("days") || 7);
    const roomId = searchParams.get("roomId");

    if (!Number.isInteger(days) || days < 1 || days > 30) {
      return Response.json(
        { message: "days ต้องเป็นจำนวนเต็ม 1-30" },
        { status: 400 }
      );
    }

    const where: {
      startTime: { gte: Date; lte: Date };
      roomId?: number;
    } = {
      startTime: {
        gte: new Date(),
        lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
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
      orderBy: { startTime: "asc" },
    });

    return Response.json({
      message: "ดึงรายการจองล่วงหน้าสำเร็จ",
      data: bookings,
    });

  } catch (error) {
    return Response.json(
      { message: "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
