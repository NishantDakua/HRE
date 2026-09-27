import { useQuery } from "@tanstack/react-query";
import { getJson } from "./api";
import { useMode } from "./mode";
import type {
  AnalyticsSummary,
  AppNotification,
  BookingDetail,
  HandoverContract,
  ListingUnits,
  MyResource,
  ResourceWithBusiness,
  UnitSummary,
} from "./types";

export function useResources(filters: { q?: string; category?: string; area?: string }) {
  return useQuery({
    queryKey: ["resources", filters],
    queryFn: () => getJson<ResourceWithBusiness[]>("/resources", filters),
  });
}

export function useResource(id: string) {
  return useQuery({
    queryKey: ["resource", id],
    queryFn: () => getJson<ResourceWithBusiness>(`/resources/${id}`),
    enabled: Boolean(id),
  });
}

export function useBookings() {
  const { mode } = useMode();
  return useQuery({
    queryKey: ["bookings", mode],
    queryFn: () => getJson<BookingDetail[]>("/bookings", { role: mode }),
  });
}

export function useBooking(id: string) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: () => getJson<BookingDetail>(`/bookings/${id}`),
    enabled: Boolean(id),
  });
}

export function useMyResources() {
  return useQuery({
    queryKey: ["resources", "mine"],
    queryFn: () => getJson<MyResource[]>("/resources/mine"),
  });
}

export function useAnalytics(range: AnalyticsSummary["range"]) {
  return useQuery({
    queryKey: ["analytics", range],
    queryFn: () => getJson<AnalyticsSummary>("/analytics", { range }),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => getJson<AppNotification[]>("/notifications"),
  });
}

export function useBookingContracts(bookingId: string) {
  return useQuery({
    queryKey: ["booking-contracts", bookingId],
    queryFn: () => getJson<HandoverContract[]>(`/bookings/${bookingId}/contracts`),
    enabled: Boolean(bookingId),
  });
}

export function useContract(id: string) {
  return useQuery({
    queryKey: ["contract", id],
    queryFn: () => getJson<HandoverContract>(`/contracts/${id}`),
    enabled: Boolean(id),
  });
}

export function useContractUnits(id: string) {
  return useQuery({
    queryKey: ["contract-units", id],
    queryFn: () => getJson<UnitSummary>(`/contracts/${id}/units`),
    enabled: Boolean(id),
  });
}

export function useListingUnits(id: string) {
  return useQuery({
    queryKey: ["listing-units", id],
    queryFn: () => getJson<ListingUnits>(`/resources/${id}/units`),
    enabled: Boolean(id),
  });
}
