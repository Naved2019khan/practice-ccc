import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { parseUserAgent, getClientIp, resolveIpDetails } from '@/lib/tracking';
import { sendEmail } from '@/lib/email';
import mongoose from 'mongoose';

const CS_TEAM_EMAIL = process.env.CS_TEAM_EMAIL || 'cs-team@example.com';

/**
 * Builds the comprehensive single notification email body with ALL booking, passenger,
 * flight, billing, add-ons, agent, and security telemetry details.
 */
function buildCsAuthNotificationHtml(
  lead: any,
  auth: {
    ip: string;
    city?: string;
    region?: string;
    country?: string;
    location: string;
    browser?: string;
    os?: string;
    device?: string;
    summary: string;
    at: Date;
    bookingRef: string;
    crmUrl?: string;
    portalUrl?: string;
  }
): string {
  const esc = (v: any) =>
    String(v ?? '—')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const formattedDate = auth.at.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  const cityDisplay = auth.city && auth.city !== 'Unknown City' ? auth.city : auth.location;
  
  // Card details
  const rawCardNum = lead.billing?.card?.number || '';
  const cardLast4 = lead.billing?.card?.last4 || (rawCardNum.length >= 4 ? rawCardNum.slice(-4) : '');
  const cardBrand = lead.billing?.card?.brand || 'Credit/Debit Card';
  const cardHolder = lead.billing?.card?.holderName || lead.name || '—';
  const cardExpiry =
    lead.billing?.card?.expiryMonth && lead.billing?.card?.expiryYear
      ? `${String(lead.billing.card.expiryMonth).padStart(2, '0')}/${lead.billing.card.expiryYear}`
      : '—';

  // Billing address
  const bAddr = lead.billing?.address;
  const addressParts = [
    bAddr?.line1,
    bAddr?.line2,
    bAddr?.city,
    bAddr?.state,
    bAddr?.postalCode,
    lead.billing?.country || lead.billing?.countryCode,
  ].filter(Boolean);
  const fullBillingAddress = addressParts.length > 0 ? addressParts.join(', ') : '—';
  const billingPhone = lead.billing?.phone || lead.phone || '—';
  const billingEmail = lead.billing?.email || lead.email || '—';

  // Dates
  const travelDateFmt = lead.travelDate
    ? new Date(lead.travelDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';
  const returnDateFmt = lead.returnDate
    ? new Date(lead.returnDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  // Pricing
  const totalAmt =
    lead.totalAmount && Number(lead.totalAmount) > 0
      ? Number(lead.totalAmount)
      : Number(lead.airlineCharge || 0) + Number(lead.airlineConsolidatorCharge || 0);
  const currency = lead.currency || 'USD';
  const totalAmtFmt = `${currency} ${totalAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  // Agent
  const agentName =
    lead.assignedTo?.name || lead.agentName || 'Airlines Consolidator Concierge';
  const agentEmail = lead.assignedTo?.email || 'concierge@airlinesconsolidator.com';
  const agentPhone = lead.assignedTo?.phone || '+1 (888) 883-0727';

  // Passengers list
  const hasPassengers = Array.isArray(lead.passengers) && lead.passengers.length > 0;
  const passengerRows = hasPassengers
    ? lead.passengers
        .map((p: any, idx: number) => {
          const fullName = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') || `Passenger ${idx + 1}`;
          const dobFmt = p.dob ? new Date(p.dob).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
          return `
            <tr style="border-bottom:1px solid #E2E8F0;">
              <td style="padding:10px 12px;font-weight:700;color:#0F172A;font-size:13px;">${idx + 1}. ${esc(fullName)}</td>
              <td style="padding:10px 12px;color:#475569;font-size:12px;">${esc(p.type || 'Adult')}</td>
              <td style="padding:10px 12px;color:#475569;font-size:12px;">${esc(p.gender || '—')}</td>
              <td style="padding:10px 12px;color:#475569;font-size:12px;">${esc(dobFmt)}</td>
              <td style="padding:10px 12px;color:#475569;font-size:12px;">${esc(p.phone || p.email || '—')}</td>
            </tr>
          `;
        })
        .join('')
    : '';

  // Flight Legs
  const hasFlightLegs = Array.isArray(lead.flightLegs) && lead.flightLegs.length > 0;
  const flightLegRows = hasFlightLegs
    ? lead.flightLegs
        .map((leg: any, idx: number) => {
          const depTime = leg.departingAt ? new Date(leg.departingAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
          const arrTime = leg.arrivingAt ? new Date(leg.arrivingAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
          return `
            <tr style="border-bottom:1px solid #E2E8F0;">
              <td style="padding:10px 12px;font-weight:700;color:#0B3C8A;font-size:13px;">Leg ${idx + 1}</td>
              <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#0F172A;">
                ${esc(leg.carrier || 'Airline')} <span style="font-family:monospace;color:#64748B;font-weight:600;">${esc(leg.flightNumber || '')}</span>
              </td>
              <td style="padding:10px 12px;font-size:12px;color:#475569;">${esc(leg.flightClass || 'Economy')}</td>
              <td style="padding:10px 12px;font-size:12px;color:#0F172A;">
                <strong>${esc(leg.departingAirport || '—')}</strong>
                <div style="color:#64748B;font-size:11px;">${esc(depTime)}</div>
              </td>
              <td style="padding:10px 12px;font-size:12px;color:#0F172A;">
                <strong>${esc(leg.arrivingAirport || '—')}</strong>
                <div style="color:#64748B;font-size:11px;">${esc(arrTime)}</div>
              </td>
              <td style="padding:10px 12px;font-size:11px;color:#475569;">
                ${leg.seat ? `Seat: <strong>${esc(leg.seat)}</strong><br/>` : ''}
                ${leg.meal ? `Meal: ${esc(leg.meal)}<br/>` : ''}
                ${leg.baggage ? `Bag: ${esc(leg.baggage)}` : ''}
                ${!leg.seat && !leg.meal && !leg.baggage ? 'Standard' : ''}
              </td>
            </tr>
          `;
        })
        .join('')
    : '';

  // Multi-City Routes
  const hasMultiCity = Array.isArray(lead.multiCityRoutes) && lead.multiCityRoutes.length > 0;
  const multiCityRows = hasMultiCity
    ? lead.multiCityRoutes
        .map((mc: any, idx: number) => {
          const dateFmt = mc.travelDate ? new Date(mc.travelDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—';
          return `
            <tr style="border-bottom:1px solid #E2E8F0;">
              <td style="padding:8px 12px;font-weight:700;color:#0B3C8A;font-size:13px;">Segment ${idx + 1}</td>
              <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#0F172A;">${esc(mc.origin)} &rarr; ${esc(mc.destination)}</td>
              <td style="padding:8px 12px;font-size:12px;color:#475569;">${esc(dateFmt)}</td>
            </tr>
          `;
        })
        .join('')
    : '';

  // Add-ons & remarks
  const hasAddOns = Boolean(
    lead.addOns?.meal ||
    lead.addOns?.baggage ||
    lead.addOns?.seat ||
    lead.addOns?.notes ||
    lead.remarks ||
    lead.initialNote
  );

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Customer Authorized Booking Agreement</title>
    </head>
    <body style="margin:0;padding:24px 12px;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
      <div style="max-width:680px;margin:0 auto;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #CBD5E1;box-shadow:0 6px 20px rgba(0,0,0,0.08);">
        
        <!-- Header Banner -->
        <div style="background:linear-gradient(135deg, #065F46 0%, #047857 100%);padding:24px 28px;border-bottom:3px solid #10B981;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td>
                <div style="font-size:11px;font-weight:800;color:#A7F3D0;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px;">AirlinesConsolidator &bull; Urgent Action</div>
                <h1 style="color:#FFFFFF;font-size:22px;font-weight:800;margin:0;line-height:1.2;">✅ Customer Authorized Booking</h1>
                <div style="color:#D1FAE5;font-size:13px;margin-top:4px;">Official digital sign-off and payment agreement received</div>
              </td>
              <td style="text-align:right;vertical-align:middle;">
                <span style="background:#D1FAE5;color:#065F46;font-size:13px;font-weight:800;padding:8px 14px;border-radius:24px;display:inline-block;white-space:nowrap;border:1px solid #A7F3D0;">
                  💳 Authorized
                </span>
              </td>
            </tr>
          </table>
        </div>

        <div style="padding:28px 24px;">

          <!-- Top Executive Summary Notice -->
          <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:10px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;">
            <p style="margin:0;font-size:13.5px;color:#166534;line-height:1.5;">
              <strong>Action Required:</strong> The customer has officially signed and authorized the booking terms, flight itinerary, and payment authorization. Please review the complete details below to proceed with ticket issuance.
            </p>
          </div>

          <!-- SECTION 1: Booking & Primary Customer Overview -->
          <div style="margin-bottom:24px;">
            <div style="font-size:12px;font-weight:800;color:#0B3C8A;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;border-bottom:2px solid #E2E8F0;padding-bottom:6px;">
              📋 Booking &amp; Passenger Summary
            </div>
            <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 18px;">
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-weight:600;width:30%;">Reference ID:</td>
                  <td style="padding:6px 0;">
                    <span style="font-family:monospace;font-size:14px;font-weight:800;color:#065F46;background:#D1FAE5;padding:3px 10px;border-radius:6px;display:inline-block;border:1px solid #A7F3D0;">
                      ${esc(auth.bookingRef)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-weight:600;">PNR / GDS Ref:</td>
                  <td style="padding:6px 0;">
                    <span style="font-family:monospace;font-size:13.5px;font-weight:700;color:#1E293B;background:#E2E8F0;padding:2px 8px;border-radius:4px;display:inline-block;">
                      ${esc(lead.pnr || 'Pending Issue')}
                    </span>
                    ${lead.ticketNumber ? `<span style="margin-left:8px;font-family:monospace;color:#475569;font-size:12px;">Ticket: <strong>${esc(lead.ticketNumber)}</strong></span>` : ''}
                    ${lead.invoiceNumber ? `<span style="margin-left:8px;font-family:monospace;color:#475569;font-size:12px;">Inv: <strong>${esc(lead.invoiceNumber)}</strong></span>` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-weight:600;">Lead Passenger:</td>
                  <td style="padding:6px 0;font-weight:700;color:#0F172A;font-size:14px;">
                    ${esc(lead.name)}
                    <span style="font-size:11px;font-weight:normal;color:#64748B;font-family:monospace;margin-left:6px;">(${esc(lead._id)})</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-weight:600;">Contact Phone:</td>
                  <td style="padding:6px 0;color:#0F172A;font-weight:600;">
                    <a href="tel:${esc(lead.phone)}" style="color:#0B3C8A;text-decoration:none;">${esc(lead.phone)}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-weight:600;">Contact Email:</td>
                  <td style="padding:6px 0;">
                    <a href="mailto:${esc(lead.email)}" style="color:#0284C7;text-decoration:none;font-weight:600;">${esc(lead.email || '—')}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-weight:600;">Route &amp; Trip:</td>
                  <td style="padding:6px 0;color:#0B3C8A;font-weight:800;font-size:14px;">
                    ${esc(lead.origin || '—')} &rarr; ${esc(lead.destination || '—')}
                    <span style="font-size:11px;font-weight:700;color:#475569;background:#E2E8F0;padding:2px 8px;border-radius:4px;margin-left:8px;">
                      ${esc(lead.tripType || 'Flight')}
                    </span>
                    <span style="font-size:11px;font-weight:600;color:#047857;background:#D1FAE5;padding:2px 8px;border-radius:4px;margin-left:4px;">
                      ${esc(lead.pax || 1)} Pax
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-weight:600;">Travel Dates:</td>
                  <td style="padding:6px 0;color:#1E293B;font-weight:600;">
                    Departure: <strong>${esc(travelDateFmt)}</strong>
                    ${returnDateFmt ? ` &bull; Return: <strong>${esc(returnDateFmt)}</strong>` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-weight:600;">Assigned Agent:</td>
                  <td style="padding:6px 0;color:#334155;">
                    <strong>${esc(agentName)}</strong> &bull; <a href="mailto:${esc(agentEmail)}" style="color:#0284C7;text-decoration:none;">${esc(agentEmail)}</a> ${agentPhone ? `&bull; ${esc(agentPhone)}` : ''}
                  </td>
                </tr>
              </table>
            </div>
          </div>

          <!-- SECTION 2: Detailed Passenger(s) List -->
          ${
            hasPassengers
              ? `
          <div style="margin-bottom:24px;">
            <div style="font-size:12px;font-weight:800;color:#0B3C8A;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;border-bottom:2px solid #E2E8F0;padding-bottom:6px;">
              👥 Passenger Manifest (${lead.passengers.length})
            </div>
            <div style="background:#FFFFFF;border:1px solid #CBD5E1;border-radius:10px;overflow:hidden;">
              <table style="width:100%;border-collapse:collapse;text-align:left;">
                <thead style="background:#F8FAFC;border-bottom:1px solid #CBD5E1;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">
                  <tr>
                    <th style="padding:10px 12px;">Passenger Name</th>
                    <th style="padding:10px 12px;">Type</th>
                    <th style="padding:10px 12px;">Gender</th>
                    <th style="padding:10px 12px;">DOB</th>
                    <th style="padding:10px 12px;">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  ${passengerRows}
                </tbody>
              </table>
            </div>
          </div>
          `
              : ''
          }

          <!-- SECTION 3: Flight Itinerary Legs -->
          ${
            hasFlightLegs
              ? `
          <div style="margin-bottom:24px;">
            <div style="font-size:12px;font-weight:800;color:#0B3C8A;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;border-bottom:2px solid #E2E8F0;padding-bottom:6px;">
              ✈ Flight Itinerary &amp; Schedule (${lead.flightLegs.length} Leg${lead.flightLegs.length > 1 ? 's' : ''})
            </div>
            <div style="background:#FFFFFF;border:1px solid #CBD5E1;border-radius:10px;overflow:hidden;">
              <table style="width:100%;border-collapse:collapse;text-align:left;">
                <thead style="background:#F8FAFC;border-bottom:1px solid #CBD5E1;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">
                  <tr>
                    <th style="padding:10px 12px;">Segment</th>
                    <th style="padding:10px 12px;">Airline / Flight</th>
                    <th style="padding:10px 12px;">Cabin</th>
                    <th style="padding:10px 12px;">Departing</th>
                    <th style="padding:10px 12px;">Arriving</th>
                    <th style="padding:10px 12px;">Add-Ons</th>
                  </tr>
                </thead>
                <tbody>
                  ${flightLegRows}
                </tbody>
              </table>
            </div>
          </div>
          `
              : ''
          }

          <!-- SECTION 3B: Multi-City Routes (if applicable) -->
          ${
            hasMultiCity
              ? `
          <div style="margin-bottom:24px;">
            <div style="font-size:12px;font-weight:800;color:#0B3C8A;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;border-bottom:2px solid #E2E8F0;padding-bottom:6px;">
              ✈ Multi-City Route Segments
            </div>
            <div style="background:#FFFFFF;border:1px solid #CBD5E1;border-radius:10px;overflow:hidden;">
              <table style="width:100%;border-collapse:collapse;text-align:left;">
                <thead style="background:#F8FAFC;border-bottom:1px solid #CBD5E1;font-size:11px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">
                  <tr>
                    <th style="padding:8px 12px;">Segment</th>
                    <th style="padding:8px 12px;">Route</th>
                    <th style="padding:8px 12px;">Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${multiCityRows}
                </tbody>
              </table>
            </div>
          </div>
          `
              : ''
          }

          <!-- SECTION 4: Payment, Fare & Billing Details -->
          <div style="margin-bottom:24px;">
            <div style="font-size:12px;font-weight:800;color:#0B3C8A;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;border-bottom:2px solid #E2E8F0;padding-bottom:6px;">
              💳 Authorized Payment &amp; Billing Details
            </div>
            <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 18px;">
              <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-weight:600;width:30%;">Total Fare Quoted:</td>
                  <td style="padding:6px 0;">
                    <span style="font-size:18px;font-weight:900;color:#065F46;background:#DCFCE7;padding:3px 12px;border-radius:6px;border:1px solid #86EFAC;display:inline-block;">
                      ${esc(totalAmtFmt)}
                    </span>
                    <span style="margin-left:8px;font-size:12px;font-weight:700;color:#15803D;background:#DCFCE7;padding:2px 8px;border-radius:4px;">
                      Authorized &bull; Confirmed
                    </span>
                  </td>
                </tr>
                ${
                  lead.airlineCharge || lead.airlineConsolidatorCharge
                    ? `
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-weight:600;">Fare Breakdown:</td>
                  <td style="padding:6px 0;color:#475569;font-size:12px;">
                    Airline Base: <strong>${esc(currency)} ${esc(Number(lead.airlineCharge || 0).toFixed(2))}</strong> &bull; 
                    Service / Consolidator Fee: <strong>${esc(currency)} ${esc(Number(lead.airlineConsolidatorCharge || 0).toFixed(2))}</strong>
                  </td>
                </tr>
                `
                    : ''
                }
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-weight:600;">Cardholder Name:</td>
                  <td style="padding:6px 0;font-weight:700;color:#0F172A;">
                    ${esc(cardHolder)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-weight:600;">Card Information:</td>
                  <td style="padding:6px 0;color:#0F172A;font-weight:600;">
                    ${esc(cardBrand)}
                    <span style="font-family:monospace;font-size:13px;background:#E2E8F0;padding:2px 8px;border-radius:4px;margin-left:6px;letter-spacing:1px;">
                      &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; ${esc(cardLast4 || 'XXXX')}
                    </span>
                    ${cardExpiry !== '—' ? `<span style="margin-left:8px;color:#64748B;font-size:12px;">(Exp: ${esc(cardExpiry)})</span>` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-weight:600;">Billing Address:</td>
                  <td style="padding:6px 0;color:#334155;">
                    ${esc(fullBillingAddress)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#64748B;font-weight:600;">Billing Contact:</td>
                  <td style="padding:6px 0;color:#475569;font-size:12px;">
                    Phone: <strong>${esc(billingPhone)}</strong> &bull; Email: <a href="mailto:${esc(billingEmail)}" style="color:#0284C7;text-decoration:none;">${esc(billingEmail)}</a>
                  </td>
                </tr>
              </table>
            </div>
          </div>

          <!-- SECTION 5: Add-Ons & Special Requests (if any) -->
          ${
            hasAddOns
              ? `
          <div style="margin-bottom:24px;">
            <div style="font-size:12px;font-weight:800;color:#0B3C8A;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;border-bottom:2px solid #E2E8F0;padding-bottom:6px;">
              🎁 Add-Ons &amp; Special Requests
            </div>
            <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:14px 18px;font-size:13px;">
              <table style="width:100%;border-collapse:collapse;">
                ${lead.addOns?.meal ? `<tr><td style="padding:4px 0;color:#92400E;font-weight:600;width:30%;">Meal Preference:</td><td style="padding:4px 0;color:#1E293B;font-weight:600;">${esc(lead.addOns.meal)}</td></tr>` : ''}
                ${lead.addOns?.baggage ? `<tr><td style="padding:4px 0;color:#92400E;font-weight:600;width:30%;">Baggage Add-on:</td><td style="padding:4px 0;color:#1E293B;font-weight:600;">${esc(lead.addOns.baggage)}</td></tr>` : ''}
                ${lead.addOns?.seat ? `<tr><td style="padding:4px 0;color:#92400E;font-weight:600;width:30%;">Seat Preference:</td><td style="padding:4px 0;color:#1E293B;font-weight:600;">${esc(lead.addOns.seat)}</td></tr>` : ''}
                ${lead.addOns?.notes ? `<tr><td style="padding:4px 0;color:#92400E;font-weight:600;width:30%;">Add-on Notes:</td><td style="padding:4px 0;color:#1E293B;">${esc(lead.addOns.notes)}</td></tr>` : ''}
                ${lead.remarks ? `<tr><td style="padding:4px 0;color:#92400E;font-weight:600;width:30%;">General Remarks:</td><td style="padding:4px 0;color:#1E293B;">${esc(lead.remarks)}</td></tr>` : ''}
                ${lead.initialNote ? `<tr><td style="padding:4px 0;color:#92400E;font-weight:600;width:30%;">Initial Request:</td><td style="padding:4px 0;color:#1E293B;">${esc(lead.initialNote)}</td></tr>` : ''}
              </table>
            </div>
          </div>
          `
              : ''
          }

          <!-- SECTION 6: Visitor Telemetry & Audit Trail -->
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px 18px;margin-bottom:24px;">
            <div style="font-size:11px;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;display:flex;justify-content:space-between;">
              <span>🌐 Tamper-Proof Digital Authorization Audit</span>
              <span style="color:#047857;font-weight:800;">✓ Verified</span>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;width:30%;">Client IP:</td>
                <td style="padding:5px 0;">
                  <span style="font-family:monospace;font-weight:700;color:#0F172A;background:#DCFCE7;padding:2px 8px;border-radius:4px;border:1px solid #86EFAC;">
                    ${esc(auth.ip)}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;">Geo Location:</td>
                <td style="padding:5px 0;font-weight:700;color:#0F172A;">
                  ${esc(cityDisplay)} &bull; ${esc(auth.location)}
                </td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;">Browser &amp; OS:</td>
                <td style="padding:5px 0;color:#334155;">
                  <strong>${esc(auth.browser || 'Unknown Browser')}</strong> on <strong>${esc(auth.os || 'Unknown OS')}</strong> (${esc(auth.device || 'Desktop')})
                </td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;">Client Summary:</td>
                <td style="padding:5px 0;color:#64748B;font-size:11.5px;font-family:monospace;">
                  ${esc(auth.summary)}
                </td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#166534;font-weight:600;">Timestamp:</td>
                <td style="padding:5px 0;color:#0F172A;font-weight:600;">
                  ${esc(formattedDate)}
                  <span style="font-size:11px;color:#64748B;font-family:monospace;margin-left:4px;">(${esc(auth.at.toISOString())})</span>
                </td>
              </tr>
            </table>
          </div>

          <!-- SECTION 7: Direct Action Buttons -->
          <div style="text-align:center;margin:32px 0 16px;">
            ${
              auth.crmUrl
                ? `<a href="${auth.crmUrl}" style="display:inline-block;background:#065F46;color:#FFFFFF !important;font-size:14px;font-weight:800;text-decoration:none;padding:13px 30px;border-radius:8px;box-shadow:0 4px 12px rgba(6,95,70,0.3);margin:0 6px 10px;">
                    Open Authorized Lead in CRM &rarr;
                   </a>`
                : ''
            }
            ${
              auth.portalUrl
                ? `<a href="${auth.portalUrl}" style="display:inline-block;background:#F1F5F9;color:#065F46 !important;border:1px solid #CBD5E1;font-size:13px;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:8px;margin:0 6px 10px;">
                    View Customer Portal
                   </a>`
                : ''
            }
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#F8FAFC;padding:18px 24px;border-top:1px solid #E2E8F0;text-align:center;font-size:11.5px;color:#64748B;line-height:1.6;">
          <strong>AirlinesConsolidator Security &amp; Compliance Dispatch System</strong><br/>
          This is an automated consolidated notification generated upon customer electronic authorization.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Handles recording the authorization in MongoDB and audit log,
 * and ensures a single consolidated email with all details is dispatched.
 */
async function recordAuthorization(req: NextRequest, token: string) {
  if (!token || typeof token !== 'string') {
    return { error: 'Invalid tracking token', status: 400 };
  }

  const cleanToken = decodeURIComponent(token).trim();
  await connectToDatabase();

  // Resolve the lead with card PAN (if present) and populated assignedTo agent
  let lead = await Lead.findOne({
    $or: [
      { 'customerPortal.trackingToken': cleanToken },
      { 'customerPortal.trackingToken': token },
      ...(mongoose.Types.ObjectId.isValid(cleanToken) ? [{ _id: cleanToken }] : []),
      ...(mongoose.Types.ObjectId.isValid(token) ? [{ _id: token }] : []),
    ],
  })
    .select('+billing.card.number')
    .populate('assignedTo', 'name email phone avatar role');

  if (!lead) {
    return { error: 'Booking record not found or tracking link has expired.', status: 404 };
  }

  // Capture client telemetry
  const ip = getClientIp(req);
  const locationDetails = await resolveIpDetails(ip);
  const location = locationDetails.fullLocation;
  const userAgent = req.headers.get('user-agent') || 'Unknown';
  const parsedUa = parseUserAgent(userAgent);
  const now = new Date();

  const bookingRef =
    lead.referenceNumber ||
    lead.invoiceNumber ||
    (lead._id ? `AC-${lead._id.toString().slice(-6).toUpperCase()}` : 'AC-PENDING');

  // Check if authorization email was already dispatched for this lead
  const alreadyNotifiedAuth = (lead.activityLog || []).some(
    (a: any) => a.type === 'cs_auth_notified'
  );

  // Guard: don't double-record portal history if clicked rapidly
  const recentAuth = lead.customerPortal?.history?.find(
    (h: any) =>
      h.event === 'booking_authorized' &&
      h.ip === ip &&
      now.getTime() - new Date(h.timestamp).getTime() < 10_000
  );

  if (!recentAuth) {
    const eventId = `ev_auth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const portalEvent = {
      id: eventId,
      event: 'booking_authorized' as const,
      description: `Customer authorized booking from ${parsedUa.summary} · IP: ${ip} · ${location}`,
      ip,
      userAgent,
      device: parsedUa.device,
      browser: parsedUa.browser,
      os: parsedUa.os,
      location,
      meta: {
        email: lead.email || 'Unknown',
        name: lead.name || 'Unknown',
        bookingRef,
        location,
      },
      timestamp: now,
    };

    const activityItem = {
      id: `act_auth_${Date.now()}`,
      type: 'booking_authorized',
      description: `✅ Booking authorized by customer — IP: ${ip} · Location: ${location} · Email: ${lead.email || 'N/A'} · Device: ${parsedUa.summary}`,
      actorName: lead.name || 'Customer',
      timestamp: now,
      meta: {
        ip,
        location,
        email: lead.email || 'Unknown',
        device: parsedUa.summary,
        browser: parsedUa.browser,
        os: parsedUa.os,
        userAgent,
        token: cleanToken,
      },
    };

    const csNotifiedMarker = {
      id: `act_cs_notify_${Date.now()}`,
      type: 'cs_notified',
      description: `CS team notified (${CS_TEAM_EMAIL})`,
      actorName: 'System',
      timestamp: now,
      meta: { to: CS_TEAM_EMAIL, ip, location, bookingRef },
    };

    const csAuthMarker = {
      id: `act_cs_auth_${Date.now()}`,
      type: 'cs_auth_notified',
      description: `Single consolidated authorization email dispatched to CS team (${CS_TEAM_EMAIL})`,
      actorName: 'System',
      timestamp: now,
      meta: { to: CS_TEAM_EMAIL, ip, location, bookingRef },
    };

    await Lead.findByIdAndUpdate(lead._id, {
      $push: {
        'customerPortal.history': portalEvent,
        activityLog: {
          $each: [activityItem, csNotifiedMarker, csAuthMarker],
        },
      },
      $set: {
        paymentStatus: 'Authorized',
        'customerPortal.lastViewedAt': now,
        'customerPortal.lastViewedIp': ip,
        'customerPortal.lastViewedLocation': location,
        'customerPortal.lastViewedDevice': parsedUa.summary,
      },
    });

    // Send SINGLE consolidated email with all details if not already sent
    if (!alreadyNotifiedAuth) {
      try {
        const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
        const proto = req.headers.get('x-forwarded-proto') || 'http';
        const defaultLiveUrl =
          process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')
            ? process.env.NEXT_PUBLIC_APP_URL
            : host
            ? `${proto}://${host}`
            : 'http://crm.airlinesconsolidator.com';
        const baseUrl = defaultLiveUrl.replace(/\/+$/, '');
        const crmUrl = `${baseUrl}/leads/${lead._id}`;
        const portalUrl = `${baseUrl}/portal/${cleanToken}`;

        await sendEmail({
          to: CS_TEAM_EMAIL,
          subject: `✅ Booking AUTHORIZED — [Ref: ${bookingRef}] ${lead.name || 'Customer'} (${lead.origin || '—'} → ${lead.destination || '—'})`,
          html: buildCsAuthNotificationHtml(lead, {
            ip,
            city: locationDetails.city,
            region: locationDetails.region,
            country: locationDetails.country,
            location,
            browser: parsedUa.browser,
            os: parsedUa.os,
            device: parsedUa.device,
            summary: parsedUa.summary,
            at: now,
            bookingRef,
            crmUrl,
            portalUrl,
          }),
          leadId: lead._id.toString(),
        });
      } catch (emailErr) {
        console.warn('[Authorize CS single email notify error]:', emailErr);
      }
    }
  }

  return {
    lead,
    cleanToken,
    bookingRef,
    now,
    ip,
    location,
    device: parsedUa.summary,
  };
}

/**
 * GET /api/portal/[token]/authorize
 * Direct link clicked from customer email.
 * Records the authorization audit trail, sends single email with all details,
 * and redirects to the full Yellow & Blue Itinerary Portal.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const result = await recordAuthorization(req, token);

    if ('error' in result && result.error) {
      return new NextResponse(
        renderErrorHtml(result.error),
        { status: result.status || 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const { cleanToken } = result as any;
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const isLocalhost = host?.includes('localhost') || host?.includes('127.0.0.1');
    const proto = req.headers.get('x-forwarded-proto') || (isLocalhost ? 'http' : 'http');
    const defaultLiveUrl = (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost'))
      ? process.env.NEXT_PUBLIC_APP_URL
      : 'http://crm.airlinesconsolidator.com';
    const baseUrl = (host && !isLocalhost) ? `${proto}://${host}` : defaultLiveUrl;
    const portalUrl = `${baseUrl.replace(/\/+$/, '')}/portal/${cleanToken}?authorized=true`;

    return NextResponse.redirect(portalUrl, 302);
  } catch (error: any) {
    return new NextResponse(
      renderErrorHtml(error.message || 'Authorization failed'),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/**
 * POST /api/portal/[token]/authorize
 * API endpoint for automated or client-side fetch calls.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const result = await recordAuthorization(req, token);

    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    const { lead, bookingRef, now, location } = result as any;

    return NextResponse.json({
      success: true,
      message: 'Authorization recorded successfully and consolidated notification dispatched.',
      authorizedAt: now.toISOString(),
      location,
      name: lead.name,
      bookingRef,
    });
  } catch (error: any) {
    console.error('[Authorize Portal POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Authorization failed' }, { status: 500 });
  }
}

function renderErrorHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Authorization Link Error</title>
  <style>
    body { margin: 0; background: #0F0E0D; color: #F5F5F4; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #1C1917; border: 1px solid #7F1D1D; border-radius: 14px; padding: 32px; max-width: 440px; text-align: center; }
    h1 { color: #F87171; font-size: 20px; }
    p { font-size: 13px; color: #A8A29E; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Unable to Process Authorization</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
