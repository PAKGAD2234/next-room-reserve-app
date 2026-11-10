
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET /api/rooms/[id]/bookings
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = Number(id);

    // ตรวจสอบ ID
    if (!Number.isInteger(roomId) || roomId <= 0) {
      return Response.json(
        { message: "ID ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีห้องหรือไม่
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return Response.json(
        { message: "ไม่พบห้องประชุม" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    // ต้องส่ง from และ to พร้อมกัน
    if ((from && !to) || (!from && to)) {
      return Response.json(
        { message: "กรุณาส่ง from และ to พร้อมกัน" },
        { status: 400 }
      );
    }

    const where: Prisma.BookingWhereInput = {
      roomId: roomId,
    };

    // กรองรายการจองที่เวลาทับซ้อน
    if (from && to) {
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

      where.startTime = {
        lt: toDate,
      };

      where.endTime = {
        gt: fromDate,
      };
    }

    // ดึงรายการจอง
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        room: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return Response.json({
      message: "ดึงรายการจองสำเร็จ",
      data: bookings,
    });

  } catch (error) {
    return Response.json(
      { message: "เกิดข้อผิดพลาดในการดึงรายการจอง" },
      { status: 500 }
    );
  }
}
