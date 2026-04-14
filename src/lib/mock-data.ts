export interface Class {
  id: string;
  name: string;
  coach: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  reserved: number;
  serviceType: "group" | "personal_training" | "kinesiology";
}

export interface Reservation {
  id: string;
  userId: string;
  classId: string;
}

export const mockClasses: Class[] = [
  {
    id: "1",
    name: "Funcional 6am",
    coach: "Juan Pérez",
    dayOfWeek: 0,
    startTime: "06:00",
    endTime: "07:00",
    capacity: 20,
    reserved: 0,
    serviceType: "group",
  },
  {
    id: "2",
    name: "Crossfit 7am",
    coach: "María García",
    dayOfWeek: 0,
    startTime: "07:00",
    endTime: "08:00",
    capacity: 15,
    reserved: 0,
    serviceType: "group",
  },
  {
    id: "3",
    name: "Yoga 6pm",
    coach: "Carlos López",
    dayOfWeek: 1,
    startTime: "18:00",
    endTime: "19:00",
    capacity: 25,
    reserved: 0,
    serviceType: "group",
  },
  {
    id: "4",
    name: "Pilates 9am",
    coach: "Laura Martínez",
    dayOfWeek: 2,
    startTime: "09:00",
    endTime: "10:00",
    capacity: 20,
    reserved: 0,
    serviceType: "group",
  },
  {
    id: "5",
    name: "HIIT 5pm",
    coach: "Juan Pérez",
    dayOfWeek: 2,
    startTime: "17:00",
    endTime: "18:00",
    capacity: 18,
    reserved: 0,
    serviceType: "group",
  },
  {
    id: "6",
    name: "Functional 6am",
    coach: "María García",
    dayOfWeek: 3,
    startTime: "06:00",
    endTime: "07:00",
    capacity: 20,
    reserved: 0,
    serviceType: "group",
  },
  {
    id: "7",
    name: "Boxing 7pm",
    coach: "Carlos López",
    dayOfWeek: 3,
    startTime: "19:00",
    endTime: "20:00",
    capacity: 16,
    reserved: 0,
    serviceType: "group",
  },
  {
    id: "8",
    name: "Zumba 6pm",
    coach: "Laura Martínez",
    dayOfWeek: 4,
    startTime: "18:00",
    endTime: "19:00",
    capacity: 30,
    reserved: 0,
    serviceType: "group",
  },
  {
    id: "9",
    name: "Spinning 7am",
    coach: "Juan Pérez",
    dayOfWeek: 5,
    startTime: "07:00",
    endTime: "08:00",
    capacity: 20,
    reserved: 0,
    serviceType: "group",
  },
  {
    id: "10",
    name: "Stretching 5pm",
    coach: "María García",
    dayOfWeek: 5,
    startTime: "17:00",
    endTime: "18:00",
    capacity: 25,
    reserved: 0,
    serviceType: "group",
  },
];

// Mock reservations (in memory)
export let mockReservations: Reservation[] = [];
