export interface Passenger {
  firstName: string;
  lastName: string;
  title?: string;
}

export interface FlightSegment {
  segmentNumber: number;

  marketingCarrier: {
    code: string;
    name?: string;
  };

  flightNumber: string;

  bookingClass: string;
  cabin?: string;

  departure: {
    airport: string;
    airportName?: string;
    city?: string;
    country?: string;
    date: string;
    time: string;
    dateTimeISO?: string;
  };

  arrival: {
    airport: string;
    airportName?: string;
    city?: string;
    country?: string;
    date: string;
    time: string;
    dateTimeISO?: string;
  };

  status: {
    code: string;
    quantity?: number;
    description?: string;
  };

  operatingCarrier?: {
    code: string;
    name?: string;
  };

  operatingFlightNumber?: string;

  codeshare: boolean;

  durationMinutes?: number;

  remarks: string[];
}

export interface NormalizedPNR {
  passengers: Passenger[];
  segments: FlightSegment[];
  metadata: {
    pnr?: string;
    source: 'amadeus' | 'sabre' | 'galileo' | 'generic';
    rawText?: string;
  };
  warnings: string[];
}

export interface FormattedSegment {
  carrierAndFlight: string;
  marketingCarrierName: string;
  marketingCarrierCode: string;
  flightNumber: string;
  cabinClass: string;
  bookingClass: string;
  departure: {
    airportCode: string;
    airportName: string;
    city: string;
    country: string;
    formattedDate: string;
    formattedTime: string;
    displayString: string;
    isoDateTime: string;
  };
  arrival: {
    airportCode: string;
    airportName: string;
    city: string;
    country: string;
    formattedDate: string;
    formattedTime: string;
    displayString: string;
    isoDateTime: string;
  };
  durationText?: string;
  operatingCarrierText?: string;
  codeshare: boolean;
  remarks: string[];
}

export interface FormattedItinerary {
  passengers: {
    fullName: string;
    firstName: string;
    lastName: string;
    title?: string;
  }[];
  segments: FormattedSegment[];
  pnr?: string;
  source: string;
  summary: {
    route: string;
    tripType: 'One Way' | 'Round Trip' | 'Multi-City';
    origin: string;
    destination: string;
    travelDate: string; // YYYY-MM-DD
    returnDate?: string; // YYYY-MM-DD
    paxCount: number;
  };
  warnings: string[];
}

export interface CRMLeadMapping {
  name: string;
  pax: number;
  passengers: {
    id: string;
    firstName: string;
    lastName: string;
    gender?: string;
    dob?: string;
  }[];
  flightLegs: {
    id: string;
    carrier: string;
    flightNumber: string;
    flightClass: string;
    departingAirport: string;
    departingAt: string;
    arrivingAirport: string;
    arrivingAt: string;
  }[];
  origin: string;
  destination: string;
  travelDate: string;
  returnDate?: string;
  tripType: 'One Way' | 'Round Trip' | 'Multi-City';
  multiCityRoutes?: {
    id: string;
    origin: string;
    destination: string;
    travelDate: string;
  }[];
  pnr?: string;
}
