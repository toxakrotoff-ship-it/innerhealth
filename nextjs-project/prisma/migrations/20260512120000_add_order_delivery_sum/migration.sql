-- Persist checkout delivery amount so emails/Telegram are correct when line items use catalog prices but total includes promos.
ALTER TABLE "Order" ADD COLUMN "deliverySum" DOUBLE PRECISION;
