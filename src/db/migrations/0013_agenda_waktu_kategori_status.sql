ALTER TABLE `agenda_kegiatan` ADD `jam_mulai` time;--> statement-breakpoint
ALTER TABLE `agenda_kegiatan` ADD `jam_selesai` time;--> statement-breakpoint
ALTER TABLE `agenda_kegiatan` ADD `kategori` varchar(50) DEFAULT 'umum' NOT NULL;--> statement-breakpoint
ALTER TABLE `agenda_kegiatan` ADD `status` enum('rencana','berlangsung','selesai') DEFAULT 'rencana' NOT NULL;