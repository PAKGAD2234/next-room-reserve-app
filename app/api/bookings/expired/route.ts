
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const roomId = Number(searchParams.get("roomId"));
    const before = searchParams.get("before");

    if (
      !Number.isInteger(roomId) ||
      roomId <= 0 ||
      !before
    ) {
      return Response.json(
        { message: "กรุณาระบุ roomId และ before" },
        { status: 400 }
      );
    }

    const beforeDate = new Date(before);

    if (
      isNaN(beforeDate.getTime()) ||
      beforeDate > new Date()
    ) {
      return Response.json(
        { message: "before ต้องเป็นเวลาที่ไม่เกินเวลาปัจจุบัน" },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return Response.json(
        { message: "ไม่พบห้องประชุม" },
        { status: 404 }
      );
    }

    const result = await prisma.booking.deleteMany({
      where: {
        roomId,
        endTime: {
          lt: beforeDate,
        },
      },
    });

    return Response.json({
      message: "ลบประวัติการจองสำเร็จ",
      deletedCount: result.count,
    });

  } catch (error) {
    return Response.json(
      { message: "เกิดข้อผิดพลาดในการลบประวัติ" },
      { status: 500 }
    );
  }
}
