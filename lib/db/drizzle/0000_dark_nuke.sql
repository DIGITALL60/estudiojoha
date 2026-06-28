CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`professional_id` text NOT NULL,
	`service_id` text NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`duration` integer NOT NULL,
	`price` integer NOT NULL,
	`status` text DEFAULT 'completado' NOT NULL,
	`payment_method` text,
	`notes` text,
	`reminder_sent` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT '"2026-06-28T21:20:33.729Z"' NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`notes` text,
	`birthday` text,
	`created_at` integer DEFAULT '"2026-06-28T21:20:33.720Z"' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`concept` text NOT NULL,
	`amount` integer NOT NULL,
	`category` text DEFAULT 'General' NOT NULL,
	`date` text NOT NULL,
	`professional_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`min_stock` integer DEFAULT 0 NOT NULL,
	`unit` text NOT NULL,
	`price` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `professional_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`professional_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `professional_services` (
	`id` text PRIMARY KEY NOT NULL,
	`professional_id` text NOT NULL,
	`service_id` text NOT NULL,
	FOREIGN KEY (`professional_id`) REFERENCES `professionals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `professionals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`email` text,
	`phone` text,
	`username` text,
	`password` text,
	`color` text DEFAULT '#7c3aed' NOT NULL,
	`initial` text NOT NULL,
	`commission_rate` integer DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX `professionals_username_unique` ON `professionals` (`username`);--> statement-breakpoint
CREATE TABLE `service_products` (
	`id` text PRIMARY KEY NOT NULL,
	`service_id` text NOT NULL,
	`product_id` text NOT NULL,
	`amount` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`duration` integer NOT NULL,
	`price` integer NOT NULL,
	`cod` text
);
--> statement-breakpoint
CREATE TABLE `vouchers` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`discount_type` text NOT NULL,
	`discount_value` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT '"2026-06-28T21:20:33.731Z"' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vouchers_code_unique` ON `vouchers` (`code`);