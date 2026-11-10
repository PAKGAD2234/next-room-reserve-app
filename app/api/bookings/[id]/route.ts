
import { prisma } from "@/lib/prisma";

// GET /api/bookings/[id]
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = Number(id);

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return Response.json(
        { message: "ID ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { room: true },
    });

    if (!booking) {
      return Response.json(
        { message: "ไม่พบรายการจอง" },
        { status: 404 }
      );
    }

    return Response.json({
      message: "ดึงรายละเอียดการจองสำเร็จ",
      data: booking,
    });

  } catch (error) {
    return Response.json(
      { message: "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}

import { Prisma } from "@prisma/client";

// PATCH /api/bookings/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = Number(id);

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return Response.json(
        { message: "ID ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const oldBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { room: true },
    });

    if (!oldBooking) {
      return Response.json(
        { message: "ไม่พบรายการจอง" },
        { status: 404 }
      );
    }

    const now = new Date();

    if (oldBooking.startTime <= now) {
      return Response.json(
        { message: "ไม่สามารถแก้ไขรายการจองที่เริ่มใช้งานแล้ว" },
        { status: 409 }
      );
    }

    const body = await req.json();

    const {
      roomId,
      bookerName,
      purpose,
      startTime,
      endTime,
      attendeeCount,
    } = body;

    const newRoomId = roomId ?? oldBooking.roomId;
    const newBookerName = bookerName ?? oldBooking.bookerName;
    const newPurpose = purpose ?? oldBooking.purpose;
    const newStart = startTime !== undefined
      ? new Date(startTime)
      : oldBooking.startTime;
    const newEnd = endTime !== undefined
      ? new Date(endTime)
      : oldBooking.endTime;
    const newCount = attendeeCount ?? oldBooking.attendeeCount;

    if (
      !Number.isInteger(newRoomId) ||
      newRoomId <= 0 ||
      typeof newBookerName !== "string" ||
      !newBookerName.trim() ||
      typeof newPurpose !== "string" ||
      !newPurpose.trim() ||
      !Number.isInteger(newCount) ||
      newCount <= 0 ||
      isNaN(newStart.getTime()) ||
      isNaN(newEnd.getTime()) ||
      newStart <= now ||
      newStart >= newEnd
    ) {
      return Response.json(
        { message: "ข้อมูลที่ส่งมาไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { id: newRoomId },
    });

    if (!room) {
      return Response.json(
        { message: "ไม่พบห้องประชุม" },
        { status: 404 }
      );
    }

    if (newCount > room.capacity) {
      return Response.json(
        { message: "จำนวนผู้เข้าร่วมเกินความจุห้อง" },
        { status: 400 }
      );
    }

    const overlap = await prisma.booking.findFirst({
      where: {
        roomId: newRoomId,
        id: { not: bookingId },
        startTime: { lt: newEnd },
        endTime: { gt: newStart },
      },
    });

    if (overlap) {
      return Response.json(
        { message: "ช่วงเวลานี้มีการจองแล้ว" },
        { status: 409 }
      );
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        roomId: newRoomId,
        bookerName: newBookerName.trim(),
        purpose: newPurpose.trim(),
        startTime: newStart,
        endTime: newEnd,
        attendeeCount: newCount,
      },
      include: { room: true },
    });

    return Response.json({
      message: "แก้ไขรายการจองสำเร็จ",
      data: updated,
    });

  } catch (error) {
    return Response.json(
      { message: "เกิดข้อผิดพลาดในการแก้ไข" },
      { status: 500 }
    );
  }
}

// DELETE /api/bookings/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bookingId = Number(id);

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      return Response.json(
        { message: "ID ไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return Response.json(
        { message: "ไม่พบรายการจอง" },
        { status: 404 }
      );
    }

    if (booking.startTime <= new Date()) {
      return Response.json(
        { message: "ไม่สามารถยกเลิกรายการที่เริ่มใช้งานแล้ว" },
        { status: 409 }
      );
    }

    await prisma.booking.delete({
      where: { id: bookingId },
    });

    return Response.json({
      message: "ยกเลิกการจองสำเร็จ",
    });

  } catch (error) {
    return Response.json(
      { message: "เกิดข้อผิดพลาดในการยกเลิก" },
      { status: 500 }
    );
  }
}
