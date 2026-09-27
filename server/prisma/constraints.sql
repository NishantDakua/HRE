-- ---------------------------------------------------------------------------
-- Data integrity Prisma's schema language can't express. Idempotent: re-run
-- after every `prisma db push` (npm run db:constraints -w server).
-- Status lists mirror the client's enums in client/src/lib/types.ts.
-- ---------------------------------------------------------------------------

ALTER TABLE "ExchangeListing" DROP CONSTRAINT IF EXISTS exchange_listing_stock;
ALTER TABLE "ExchangeListing" ADD CONSTRAINT exchange_listing_stock
  CHECK (quantity >= 0 AND available >= 0 AND available <= quantity AND price >= 0 AND "minRentalHours" >= 0);

ALTER TABLE "ExchangeListing" DROP CONSTRAINT IF EXISTS exchange_listing_status;
ALTER TABLE "ExchangeListing" ADD CONSTRAINT exchange_listing_status
  CHECK (status IN ('ACTIVE', 'PAUSED', 'DRAFT'));

ALTER TABLE "ExchangeBooking" DROP CONSTRAINT IF EXISTS exchange_booking_window;
ALTER TABLE "ExchangeBooking" ADD CONSTRAINT exchange_booking_window
  CHECK ("endAt" > "startAt" AND total >= 0);

ALTER TABLE "ExchangeBooking" DROP CONSTRAINT IF EXISTS exchange_booking_status;
ALTER TABLE "ExchangeBooking" ADD CONSTRAINT exchange_booking_status
  CHECK (status IN ('PENDING', 'COUNTERED', 'ACCEPTED', 'CONFIRMED', 'IN_USE', 'COMPLETED', 'REJECTED', 'CANCELLED'));

ALTER TABLE "ExchangeBookingItem" DROP CONSTRAINT IF EXISTS exchange_booking_item_amounts;
ALTER TABLE "ExchangeBookingItem" ADD CONSTRAINT exchange_booking_item_amounts
  CHECK (quantity > 0 AND "agreedPrice" >= 0);

ALTER TABLE "ExchangeOffer" DROP CONSTRAINT IF EXISTS exchange_offer_values;
ALTER TABLE "ExchangeOffer" ADD CONSTRAINT exchange_offer_values
  CHECK (price >= 0 AND quantity > 0 AND round >= 1 AND status IN ('OPEN', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'EXPIRED'));

ALTER TABLE "ExchangeReview" DROP CONSTRAINT IF EXISTS exchange_review_rating;
ALTER TABLE "ExchangeReview" ADD CONSTRAINT exchange_review_rating
  CHECK (rating BETWEEN 1 AND 5);
