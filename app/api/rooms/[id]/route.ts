
import { prisma } from "@/lib/prisma";

// GET /api/rooms/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = Number(id);

    if (!Number.isInteger(roomId) || roomId <= 0) {
      return Response.json(
        { message: "ID ไม่ถูกต้อง" },
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

    return Response.json({
      message: "ดึงข้อมูลห้องประชุมสำเร็จ",
      data: room,
    });
  } catch (error) {
    return Response.json(
      { message: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = Number(id);

    if (!Number.isInteger(roomId) || roomId <= 0) {
      return Response.json(
        { message: "ID ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const existingRoom = await prisma.room.findUnique({
      where: { id: roomId },
      include: { bookings: true },
    });

    if (!existingRoom) {
      return Response.json(
        { message: "ไม่พบห้องประชุม" },
        { status: 404 }
      );
    }

    const body = await req.json();

    const { roomCode, roomName, capacity, location } = body;

    // ตรวจสอบข้อมูลที่ส่งมา
    if (
      (roomCode !== undefined &&
        (typeof roomCode !== "string" || !roomCode.trim())) ||
      (roomName !== undefined &&
        (typeof roomName !== "string" || !roomName.trim())) ||
      (location !== undefined &&
        (typeof location !== "string" || !location.trim()))
    ) {
      return Response.json(
        { message: "ข้อมูลข้อความห้ามว่าง" },
        { status: 400 }
      );
    }

    if (
      capacity !== undefined &&
      (!Number.isInteger(capacity) || capacity <= 0)
    ) {
      return Response.json(
        { message: "capacity ต้องเป็นจำนวนเต็มมากกว่า 0" },
        { status: 400 }
      );
    }

    // ตรวจสอบรหัสห้องซ้ำ
    if (roomCode !== undefined) {
      const duplicate = await prisma.room.findFirst({
        where: {
          roomCode: roomCode.trim(),
          NOT: { id: roomId },
        },
      });

      if (duplicate) {
        return Response.json(
          { message: "รหัสห้องนี้มีอยู่แล้ว" },
          { status: 409 }
        );
      }
    }

    // ตรวจสอบความจุกับรายการจองที่ยังไม่สิ้นสุด
    const newCapacity = capacity ?? existingRoom.capacity;

    const hasTooManyAttendees = existingRoom.bookings.some(
      (booking) =>
        booking.endTime > new Date() &&
        booking.attendeeCount > newCapacity
    );

    if (hasTooManyAttendees) {
      return Response.json(
        {
          message: "ไม่สามารถลดความจุได้ เนื่องจากมีรายการจองที่เกินความจุใหม่",
        },
        { status: 409 }
      );
    }

    // แก้ไขเฉพาะฟิลด์ที่ส่งมา
    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: {
        ...(roomCode !== undefined && { roomCode: roomCode.trim() }),
        ...(roomName !== undefined && { roomName: roomName.trim() }),
        ...(capacity !== undefined && { capacity }),
        ...(location !== undefined && { location: location.trim() }),
      },
    });

    return Response.json({
      message: "แก้ไขข้อมูลห้องประชุมสำเร็จ",
      data: updatedRoom,
    });
  } catch (error) {
    return Response.json(
      { message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = Number(id);

    if (!Number.isInteger(roomId) || roomId <= 0) {
      return Response.json(
        { message: "ID ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // ตรวจสอบว่ามีห้องนี้หรือไม่
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { bookings: true },
    });

    if (!room) {
      return Response.json(
        { message: "ไม่พบห้องประชุม" },
        { status: 404 }
      );
    }

    // ตรวจสอบว่ามีรายการจองหรือไม่
    if (room.bookings.length > 0) {
      return Response.json(
        { message: "ไม่สามารถลบห้องที่มีรายการจองได้" },
        { status: 409 }
      );
    }

    // ลบห้องประชุม
    await prisma.room.delete({
      where: { id: roomId },
    });

    return Response.json({
      message: "ลบห้องประชุมสำเร็จ",
    });
  } catch (error) {
    return Response.json(
      { message: "เกิดข้อผิดพลาดในการลบห้องประชุม" },
      { status: 500 }
    );
  }
}
