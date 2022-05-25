
CREATE TABLE `puzzles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` text NOT NULL,
  `solved` int(8) NOT NULL DEFAULT 0,
  `impossible` int(8) NOT NULL DEFAULT 0,
  `level` int(11) NOT NULL DEFAULT -1,
  PRIMARY KEY (`id`)
);

CREATE TABLE `solutions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pid` int(11) NOT NULL,
  `code` varchar(5000) NOT NULL,
  `solution` varchar(5000) NOT NULL,
  `player` varchar(100) DEFAULT '',
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ;

CREATE TABLE `impossible` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pid` int(11) NOT NULL,
  `player` varchar(100) DEFAULT '',
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
);
