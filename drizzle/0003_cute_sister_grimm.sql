ALTER TABLE `users` ADD `stripeCustomerId` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `stripePaymentStatus` enum('active','past_due','cancelled','unpaid','trial') DEFAULT 'trial';