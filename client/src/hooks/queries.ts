import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, apiErrorMessage, asConflict } from "@/lib/api";
import { applyResponse } from "@/lib/bookings";
import * as mock from "@/lib/mockApi";
import type {
  AnalyticsRange,
  AnalyticsReport,
  AnalyticsSummary,
  Availability,
  Booking,
  BookingDetail,
  BundleInput,
  CreateBookingInput,
  CreateResourceInput,
  DateRange,
  MatchResult,
  MyResource,
  Notification,
  ParsedRequest,
  Requirement,
  ResourceFilters,
  ResourceWithBusiness,
  RespondBookingInput,
  ReviewInput,
  Role,
  SavedSearch,
  UpdateResourceInput,
  HandoverContract,
  ListingUnits,
  UnitSummary,
} from "@/lib/types";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

/** Serve mock data (400ms delay) or call the API. */
function source<T>(fromMock: () => Promise<T>, fromApi: () => Promise<T>): Promise<T> {
  return USE_MOCK ? fromMock() : fromApi();
}

const data = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data);

export const queryKeys = {
  resources: (filters: ResourceFilters = {}) => ["resources", filters] as const,
  resource: (id: string) => ["resource", id] as const,
  availability: (resourceId: string) => ["resource", resourceId, "availability"] as const,
  matches: (req: Requirement | null) => ["matches", req] as const,
  bookings: (role: Role) => ["bookings", role] as const,
  booking: (id: string) => ["booking", id] as const,
  analytics: (range: AnalyticsRange) => ["analytics", range] as const,
  report: (range: DateRange) => ["analytics", "report", range] as const,
  notifications: () => ["notifications"] as const,
  myResources: () => ["resources", "mine"] as const,
  contract: (id: string) => ["contract", id] as const,
  savedSearches: () => ["saved-searches"] as const,
};

/* ------------------------------------------------------------------ */
/* Resources                                                           */
/* ------------------------------------------------------------------ */

export function useResources(filters: ResourceFilters = {}) {
  return useQuery({
    queryKey: queryKeys.resources(filters),
    queryFn: () =>
      source(
        () => mock.getResources(filters),
        () => data(api.get<ResourceWithBusiness[]>("/resources", { params: filters }))
      ),
    placeholderData: keepPreviousData,
  });
}

export function useResource(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.resource(id ?? ""),
    queryFn: () =>
      source(
        () => mock.getResource(id!),
        () => data(api.get<ResourceWithBusiness>(`/resources/${id}`))
      ),
    enabled: !!id,
  });
}

export function useAvailability(resourceId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.availability(resourceId ?? ""),
    queryFn: () =>
      source(
        () => mock.getAvailability(resourceId!),
        () => data(api.get<Availability>(`/resources/${resourceId}/availability`))
      ),
    enabled: !!resourceId,
  });
}

export function useMyResources() {
  return useQuery({
    queryKey: queryKeys.myResources(),
    queryFn: () =>
      source(
        () => mock.getMyResources(),
        () => data(api.get<MyResource[]>("/resources/mine"))
      ),
  });
}

/** Everything that depends on a provider's listings. */
function invalidateListings(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: ["resources"] }); // also covers ["resources", "mine"]
  qc.invalidateQueries({ queryKey: ["analytics"] });
  qc.invalidateQueries({ queryKey: ["matches"] });
  if (id) qc.invalidateQueries({ queryKey: ["resource", id] });
}

export function useCreateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateResourceInput) =>
      source(
        () => mock.createResource(input),
        () => data(api.post<ResourceWithBusiness>("/resources", input))
      ),
    onSuccess: (r) => {
      invalidateListings(qc, r.id);
      toast.success("Listing published", { description: r.title });
    },
    onError: (e) => toast.error("Couldn't publish listing", { description: apiErrorMessage(e) }),
  });
}

export function useUpdateResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateResourceInput) =>
      source(
        () => mock.updateResource(input),
        () => data(api.patch<ResourceWithBusiness>(`/resources/${input.id}`, input.patch))
      ),
    // Optimistic: status toggles and edits show immediately in "My listings".
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.myResources() });
      const previous = qc.getQueryData<MyResource[]>(queryKeys.myResources());
      qc.setQueryData<MyResource[]>(queryKeys.myResources(), (old) => old?.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      return { previous };
    },
    onError: (e, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKeys.myResources(), ctx.previous);
      toast.error("Couldn't update listing — change undone", { description: apiErrorMessage(e) });
    },
    onSuccess: (r, { patch }) => {
      const onlyStatus = Object.keys(patch).length === 1 && patch.status;
      toast.success(onlyStatus ? (patch.status === "PAUSED" ? "Listing paused" : "Listing live again") : "Listing updated", {
        description: r.title,
      });
    },
    onSettled: (_r, _e, { id }) => invalidateListings(qc, id),
  });
}

/* ------------------------------------------------------------------ */
/* Matching + parsing                                                  */
/* ------------------------------------------------------------------ */

export function useMatches(requirement: Requirement | null) {
  return useQuery({
    queryKey: queryKeys.matches(requirement),
    queryFn: () =>
      source(
        () => mock.getMatches(requirement!),
        () => data(api.post<MatchResult[]>("/matches", requirement))
      ),
    enabled: !!requirement,
    // Keep the old ranking on screen while re-ranking so cards can animate to new positions.
    placeholderData: keepPreviousData,
  });
}

export function useParseRequest() {
  return useMutation({
    mutationFn: (text: string) =>
      source(
        () => mock.parseRequest(text),
        () => data(api.post<ParsedRequest>("/requests/parse", { text }))
      ),
    onError: (e) => toast.error("Couldn't read that request", { description: apiErrorMessage(e) }),
  });
}

/* ------------------------------------------------------------------ */
/* Bookings                                                            */
/* ------------------------------------------------------------------ */

export function useBookings(role: Role) {
  return useQuery({
    queryKey: queryKeys.bookings(role),
    queryFn: () =>
      source(
        () => mock.getBookings(role),
        () => data(api.get<BookingDetail[]>("/bookings", { params: { role } }))
      ),
  });
}

export function useBooking(id: string | undefined, options: { refetchInterval?: number } = {}) {
  return useQuery({
    queryKey: queryKeys.booking(id ?? ""),
    queryFn: () =>
      source(
        () => mock.getBooking(id!),
        () => data(api.get<BookingDetail>(`/bookings/${id}`))
      ),
    enabled: !!id,
    refetchInterval: options.refetchInterval,
    refetchIntervalInBackground: false,
  });
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookingId, ...body }: ReviewInput) =>
      source(
        () => mock.submitReview({ bookingId, ...body }),
        () => data(api.post<BookingDetail>(`/bookings/${bookingId}/reviews`, body))
      ),
    onSuccess: (b) => {
      qc.setQueryData(queryKeys.booking(b.id), b);
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Thanks for the review", { description: `${b.ref} · helps everyone on Spare pick well` });
    },
    onError: (e) => toast.error("Couldn't post your review", { description: apiErrorMessage(e) }),
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) =>
      source(
        () => mock.createBooking(input),
        () =>
          data(api.post<Booking>("/bookings", input)).catch((e: unknown) => {
            throw asConflict(e) ?? e;
          })
      ),
    onSuccess: (b, input) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: queryKeys.availability(input.resourceId) });
      toast.success("Request sent", { description: `${b.ref} · waiting for the provider` });
    },
    onError: (e, input) => {
      // Conflicts are shown by the caller (with alternatives); refresh availability either way.
      if (asConflict(e)) {
        qc.invalidateQueries({ queryKey: queryKeys.availability(input.resourceId) });
        return;
      }
      toast.error("Couldn't send request", { description: apiErrorMessage(e) });
    },
  });
}

export function useCreateBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BundleInput) =>
      source(
        () => mock.createBundle(input),
        () => data(api.post<Booking[]>("/bookings/bundle", input))
      ),
    onSuccess: (bookings) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
      toast.success("Bundle requested", { description: `${bookings.length} providers · ${bookings.map((b) => b.ref).join(", ")}` });
    },
    onError: (e) => toast.error("Couldn't request the bundle", { description: apiErrorMessage(e) }),
  });
}

const RESPOND_COPY: Record<RespondBookingInput["action"], string> = {
  accept: "Booking accepted",
  reject: "Booking declined",
  counter: "Counter-offer sent",
};

export function useRespondBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: RespondBookingInput) =>
      source(
        () => mock.respondBooking({ id, ...body }),
        () => data(api.post<BookingDetail>(`/bookings/${id}/respond`, body))
      ),
    // Optimistic: flip the status in every cached list (and the detail) right away.
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ["bookings"] });
      await qc.cancelQueries({ queryKey: queryKeys.booking(input.id) });
      const lists = qc.getQueriesData<BookingDetail[]>({ queryKey: ["bookings"] });
      const single = qc.getQueryData<BookingDetail>(queryKeys.booking(input.id));
      qc.setQueriesData<BookingDetail[]>({ queryKey: ["bookings"] }, (old) => old?.map((b) => applyResponse(b, input)));
      if (single) qc.setQueryData(queryKeys.booking(input.id), applyResponse(single, input));
      return { lists, single };
    },
    onError: (e, input, ctx) => {
      ctx?.lists.forEach(([key, value]) => qc.setQueryData(key, value));
      if (ctx?.single) qc.setQueryData(queryKeys.booking(input.id), ctx.single);
      toast.error("Couldn't update the request — change undone", { description: apiErrorMessage(e) });
    },
    onSuccess: (b, input) => {
      qc.setQueryData(queryKeys.booking(b.id), b);
      const other = input.as === "seeker" ? b.provider.name : b.seeker.name;
      toast.success(RESPOND_COPY[input.action], { description: `${b.ref} · ${other}` });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["analytics"] });
      qc.invalidateQueries({ queryKey: ["resources", "mine"] });
    },
  });
}

export function useSavedSearches() {
  return useQuery({
    queryKey: queryKeys.savedSearches(),
    queryFn: () =>
      source(
        () => mock.getSavedSearches(),
        () => data(api.get<SavedSearch[]>("/saved-searches"))
      ),
  });
}

/* ------------------------------------------------------------------ */
/* Analytics + notifications                                           */
/* ------------------------------------------------------------------ */

export function useAnalytics(range: AnalyticsRange) {
  return useQuery({
    queryKey: queryKeys.analytics(range),
    queryFn: () =>
      source(
        () => mock.getAnalytics(range),
        () => data(api.get<AnalyticsSummary>("/analytics", { params: { range } }))
      ),
    placeholderData: keepPreviousData,
  });
}

export function useAnalyticsReport(range: DateRange) {
  return useQuery({
    queryKey: queryKeys.report(range),
    queryFn: () =>
      source(
        () => mock.getAnalyticsReport(range),
        () => data(api.get<AnalyticsReport>("/analytics/report", { params: range }))
      ),
    placeholderData: keepPreviousData,
  });
}

export function useSubscribeNewsletter() {
  return useMutation({
    mutationFn: (email: string) =>
      source(
        () => mock.subscribeNewsletter(email),
        () => data(api.post<{ subscribed: boolean }>("/newsletter", { email }))
      ),
    onSuccess: () => toast.success("You're on the list", { description: "One short email a month. Unsubscribe anytime." }),
    onError: (e) => toast.error("Couldn't subscribe", { description: apiErrorMessage(e) }),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () =>
      source(
        () => mock.getNotifications(),
        () => data(api.get<Notification[]>("/notifications"))
      ),
    refetchInterval: USE_MOCK ? false : 60_000,
  });
}

function rememberContract(qc: ReturnType<typeof useQueryClient>, contract: HandoverContract) {
  qc.setQueryData(queryKeys.contract(contract.id), contract);
  qc.invalidateQueries({ queryKey: ["contracts", "booking", contract.bookingId] });
}

export function useBookingContracts(bookingId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["contracts", "booking", bookingId ?? ""],
    queryFn: () => data(api.get<HandoverContract[]>(`/bookings/${bookingId}/contracts`)),
    enabled: Boolean(bookingId) && enabled && !USE_MOCK,
  });
}

export function useContract(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contract(id ?? ""),
    queryFn: () => data(api.get<HandoverContract>(`/contracts/${id}`)),
    enabled: Boolean(id) && !USE_MOCK,
  });
}

export function useRecordArrival() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data(api.post<HandoverContract>(`/contracts/${id}/scan`)),
    onSuccess: (contract) => rememberContract(qc, contract),
    onError: (e) => toast.error("Scan was not recorded", { description: apiErrorMessage(e) }),
  });
}

export function useApproveHandover() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data(api.post<HandoverContract>(`/contracts/${id}/approve`)),
    onSuccess: (contract) => {
      rememberContract(qc, contract);
      toast.success("Approved");
    },
    onError: (e) => toast.error("Couldn't record the approval", { description: apiErrorMessage(e) }),
  });
}

export function useSignContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, purpose, dataUrl }: { id: string; purpose: "DISPATCH" | "RECEIPT"; dataUrl: string }) =>
      data(api.post<HandoverContract>(`/contracts/${id}/sign`, { purpose, dataUrl })),
    onSuccess: (contract) => {
      rememberContract(qc, contract);
      toast.success("Signed page saved");
    },
    onError: (e) => toast.error("Couldn't save that scan", { description: apiErrorMessage(e) }),
  });
}

export function useOpenDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      nature: string;
      note: string;
      receivedQuantity?: number;
      damagedQuantity?: number;
      severity?: "MINOR" | "MODERATE" | "SEVERE";
    }) => data(api.post<HandoverContract>(`/contracts/${id}/disputes`, body)),
    onSuccess: (contract) => {
      rememberContract(qc, contract);
      toast.success("Dispute opened", { description: "It closes when both sides agree." });
    },
    onError: (e) => toast.error("Couldn't open the dispute", { description: apiErrorMessage(e) }),
  });
}

export function useListingUnits(id: string | undefined) {
  return useQuery({
    queryKey: ["units", id ?? ""],
    queryFn: () => data(api.get<ListingUnits>(`/resources/${id}/units`)),
    enabled: Boolean(id) && !USE_MOCK,
  });
}

export function useContractUnits(id: string | undefined) {
  return useQuery({
    queryKey: ["contract-units", id ?? ""],
    queryFn: () => data(api.get<UnitSummary>(`/contracts/${id}/units`)),
    enabled: Boolean(id) && !USE_MOCK,
  });
}

export function useSaveUnitPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      phase: "DISPATCH" | "RECEIPT" | "RETURN";
      kind: "LABEL" | "DAMAGE";
      dataUrl: string;
      codes: string[];
    }) =>
      data(
        api.post<{ accepted: { code: string; label: string }[]; unknown: string[]; skipped: string[]; summary: UnitSummary }>(
          `/contracts/${id}/units`,
          body
        )
      ),
    onSuccess: (result, body) => {
      qc.setQueryData(["contract-units", body.id], result.summary);
      qc.invalidateQueries({ queryKey: queryKeys.contract(body.id) });
      const read = result.accepted.length;
      toast.success(read ? `Read ${read} label${read === 1 ? "" : "s"}` : "Photo saved", {
        description: result.unknown.length ? `${result.unknown.length} codes in the photo are not on this order.` : undefined,
      });
    },
    onError: (e) => toast.error("Couldn't save that photo", { description: apiErrorMessage(e) }),
  });
}

export function useAgreeDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, disputeId }: { id: string; disputeId: string }) =>
      data(api.post<HandoverContract>(`/contracts/${id}/disputes/${disputeId}/agree`)),
    onSuccess: (contract) => {
      rememberContract(qc, contract);
      toast.success("Agreement recorded");
    },
    onError: (e) => toast.error("Couldn't record agreement", { description: apiErrorMessage(e) }),
  });
}
