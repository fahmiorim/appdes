ALTER TABLE galeri_album
  ADD COLUMN kategori VARCHAR(80) NULL AFTER keterangan,
  ADD COLUMN published_at TIMESTAMP NULL AFTER kategori,
  ADD INDEX galeri_album_village_category_published_idx (village_id, kategori, published_at);

CREATE TABLE galeri_video (
  id INT NOT NULL AUTO_INCREMENT,
  village_id INT NOT NULL,
  judul VARCHAR(150) NOT NULL,
  keterangan TEXT NULL,
  url VARCHAR(500) NOT NULL,
  provider VARCHAR(20) NOT NULL,
  thumbnail VARCHAR(255) NULL,
  aktif BOOLEAN NOT NULL DEFAULT TRUE,
  published_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY galeri_video_village_published_idx (village_id, aktif, published_at),
  CONSTRAINT galeri_video_village_fk
    FOREIGN KEY (village_id) REFERENCES villages(id) ON DELETE CASCADE
);
