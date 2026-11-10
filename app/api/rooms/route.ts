
import { prisma } from "@/lib/prisma";

// POST /api/rooms
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { roomCode, roomName, capacity, location } = body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (
      !roomCode?.trim() ||
      !roomName?.trim() ||
      !location?.trim() ||
      capacity === undefined ||
      capacity === null
    ) {
      return Response.json(
        { message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" },
        { status: 400 }
      );
    }

    // ตรวจสอบ capacity
    if (!Number.isInteger(capacity) || capacity <= 0) {
      return Response.json(
        { message: "capacity ต้องเป็นจำนวนเต็มมากกว่า 0" },
        { status: 400 }
      );
    }

    // ตรวจสอบรหัสห้องซ้ำ
    const existingRoom = await prisma.room.findUnique({
      where: { roomCode: roomCode.trim() },
    });

    if (existingRoom) {
      return Response.json(
        { message: "รหัสห้องนี้มีอยู่แล้ว" },
        { status: 409 }
      );
    }

    // เพิ่มข้อมูลห้องประชุม
    const room = await prisma.room.create({
      data: {
        roomCode: roomCode.trim(),
        roomName: roomName.trim(),
        capacity,
        location: location.trim(),
      },
    });

    return Response.json(
      {
        message: "เพิ่มห้องประชุมสำเร็จ",
        data: room,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return Response.json(
        { message: "รหัสห้องนี้มีอยู่แล้ว" },
        { status: 409 }
      );
    }

    return Response.json(
      { message: "เกิดข้อผิดพลาดในการเพิ่มห้องประชุม" },
      { status: 500 }
    );
  }
}


export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search");
    const minCapacity = searchParams.get("minCapacity");

    // ตรวจสอบ minCapacity
    if (minCapacity !== null) {
      const capacity = Number(minCapacity);

      if (!Number.isInteger(capacity) || capacity <= 0) {
        return Response.json(
          { message: "minCapacity ต้องเป็นจำนวนเต็มมากกว่า 0" },
          { status: 400 }
        );
      }
    }

    // เงื่อนไขค้นหา
    const where: {
  OR?: { roomName?: { contains: string }; location?: { contains: string } }[];
  capacity?: { gte: number };
    } = {};

    if (search?.trim()) {
      where.OR = [
        {
          roomName: {
            contains: search.trim(),
          },
        },
        {
          location: {
            contains: search.trim(),
          },
        },
      ];
    }

    if (minCapacity !== null) {
      where.capacity = {
        gte: Number(minCapacity),
      };
    }

    // ดึงข้อมูลห้องประชุม
    const rooms = await prisma.room.findMany({
      where,
      orderBy: {
        id: "asc",
      },
    });

    return Response.json({
      message: "ดึงข้อมูลห้องประชุมสำเร็จ",
      data: rooms,
    });
  } catch (error) {
    return Response.json(
      { message: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      { status: 500 }
    );
  }
}
