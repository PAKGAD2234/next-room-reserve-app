
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// POST /api/bookings
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      roomId,
      bookerName,
      purpose,
      startTime,
      endTime,
      attendeeCount,
    } = body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (
      !Number.isInteger(roomId) ||
      roomId <= 0 ||
      typeof bookerName !== "string" ||
      !bookerName.trim() ||
      typeof purpose !== "string" ||
      !purpose.trim() ||
      !startTime ||
      !endTime ||
      attendeeCount === undefined
    ) {
      return Response.json(
        { message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" },
        { status: 400 }
      );
    }

    // ตรวจสอบจำนวนผู้เข้าร่วม
    if (!Number.isInteger(attendeeCount) || attendeeCount <= 0) {
      return Response.json(
        { message: "attendeeCount ต้องเป็นจำนวนเต็มมากกว่า 0" },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // ตรวจสอบเวลา
    if (
      isNaN(start.getTime()) ||
      isNaN(end.getTime()) ||
      start <= new Date() ||
      start >= end
    ) {
      return Response.json(
        { message: "เวลาไม่ถูกต้อง หรือเวลาเริ่มต้องเป็นอนาคต" },
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

    // ตรวจสอบความจุ
    if (attendeeCount > room.capacity) {
      return Response.json(
        { message: "จำนวนผู้เข้าร่วมเกินความจุของห้อง" },
        { status: 400 }
      );
    }

    // ตรวจสอบเวลาจองทับซ้อน
    const overlapping = await prisma.booking.findFirst({
      where: {
        roomId,
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    if (overlapping) {
      return Response.json(
        { message: "ช่วงเวลานี้มีการจองแล้ว" },
        { status: 409 }
      );
    }

    // บันทึกการจอง
    const booking = await prisma.booking.create({
      data: {
        roomId,
        bookerName: bookerName.trim(),
        purpose: purpose.trim(),
        startTime: start,
        endTime: end,
        attendeeCount,
      },
      include: {
        room: true,
      },
    });

    return Response.json(
      {
        message: "จองห้องประชุมสำเร็จ",
        data: booking,
      },
      { status: 201 }
    );

  } catch (error) {
    return Response.json(
      { message: "เกิดข้อผิดพลาดในการจองห้องประชุม" },
      { status: 500 }
    );
  }
}

// GET /api/bookings
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search");
    const roomId = searchParams.get("roomId");
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 10);

    if (
      !Number.isInteger(page) ||
      page <= 0 ||
      !Number.isInteger(limit) ||
      limit <= 0
    ) {
      return Response.json(
        { message: "page และ limit ต้องเป็นจำนวนเต็มมากกว่า 0" },
        { status: 400 }
      );
    }

    const where: Prisma.BookingWhereInput = {};

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

    if (search?.trim()) {
      where.OR = [
        {
          bookerName: {
            contains: search.trim(),
          },
        },
        {
          purpose: {
            contains: search.trim(),
          },
        },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          room: true,
        },
        orderBy: {
          startTime: "asc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return Response.json({
      message: "ดึงรายการจองสำเร็จ",
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    return Response.json(
      { message: "เกิดข้อผิดพลาดในการดึงรายการจอง" },
      { status: 500 }
    );
  }
}
