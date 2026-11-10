
import { prisma } from "@/lib/prisma";

// GET /api/rooms/available
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");
    const attendeeCount = searchParams.get("attendeeCount");

    // ตรวจสอบว่ามีเวลาเริ่มและเวลาสิ้นสุด
    if (!startTime || !endTime) {
      return Response.json(
        { message: "กรุณาระบุ startTime และ endTime" },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // ตรวจสอบรูปแบบเวลา
    if (
      isNaN(start.getTime()) ||
      isNaN(end.getTime()) ||
      start >= end
    ) {
      return Response.json(
        { message: "ช่วงเวลาไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // ตรวจสอบจำนวนผู้เข้าร่วม (ถ้ามี)
    let count: number | undefined;

    if (attendeeCount !== null) {
      count = Number(attendeeCount);

      if (!Number.isInteger(count) || count <= 0) {
        return Response.json(
          { message: "attendeeCount ต้องเป็นจำนวนเต็มมากกว่า 0" },
          { status: 400 }
        );
      }
    }

    // ค้นหาห้องที่ว่าง
    const rooms = await prisma.room.findMany({
      where: {
        ...(count !== undefined && {
          capacity: {
            gte: count,
          },
        }),
        bookings: {
          none: {
            startTime: {
              lt: end,
            },
            endTime: {
              gt: start,
            },
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    return Response.json({
      message: "ค้นหาห้องว่างสำเร็จ",
      data: rooms,
    });

  } catch (error) {
    return Response.json(
      { message: "เกิดข้อผิดพลาดในการค้นหาห้องว่าง" },
      { status: 500 }
    );
  }
}
