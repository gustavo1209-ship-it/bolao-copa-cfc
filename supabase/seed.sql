-- ============================================================
-- Seed: Partidas da Copa do Mundo 2026
-- Fase de Grupos – 72 jogos
-- Datas aproximadas (atualizar via admin/SofaScore quando confirmadas)
-- ============================================================

-- Grupo A: México, África do Sul, Coreia do Sul, Rep. Tcheca
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage, group_name) values
('México', 'África do Sul', '🇲🇽', '🇿🇦', '2026-06-11 20:00:00-03', 'group', 'A'),
('Coreia do Sul', 'Rep. Tcheca', '🇰🇷', '🇨🇿', '2026-06-12 17:00:00-03', 'group', 'A'),
('México', 'Coreia do Sul', '🇲🇽', '🇰🇷', '2026-06-15 20:00:00-03', 'group', 'A'),
('África do Sul', 'Rep. Tcheca', '🇿🇦', '🇨🇿', '2026-06-15 17:00:00-03', 'group', 'A'),
('México', 'Rep. Tcheca', '🇲🇽', '🇨🇿', '2026-06-19 20:00:00-03', 'group', 'A'),
('África do Sul', 'Coreia do Sul', '🇿🇦', '🇰🇷', '2026-06-19 20:00:00-03', 'group', 'A');

-- Grupo B: Canadá, Bósnia-Herzegovina, Catar, Suíça
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage, group_name) values
('Canadá', 'Bósnia-Herzegovina', '🇨🇦', '🇧🇦', '2026-06-12 20:00:00-03', 'group', 'B'),
('Catar', 'Suíça', '🇶🇦', '🇨🇭', '2026-06-13 17:00:00-03', 'group', 'B'),
('Canadá', 'Catar', '🇨🇦', '🇶🇦', '2026-06-16 20:00:00-03', 'group', 'B'),
('Bósnia-Herzegovina', 'Suíça', '🇧🇦', '🇨🇭', '2026-06-16 17:00:00-03', 'group', 'B'),
('Canadá', 'Suíça', '🇨🇦', '🇨🇭', '2026-06-20 20:00:00-03', 'group', 'B'),
('Bósnia-Herzegovina', 'Catar', '🇧🇦', '🇶🇦', '2026-06-20 20:00:00-03', 'group', 'B');

-- Grupo C: Brasil, Marrocos, Haiti, Escócia
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage, group_name) values
('Brasil', 'Marrocos', '🇧🇷', '🇲🇦', '2026-06-13 20:00:00-03', 'group', 'C'),
('Haiti', 'Escócia', '🇭🇹', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '2026-06-14 17:00:00-03', 'group', 'C'),
('Brasil', 'Haiti', '🇧🇷', '🇭🇹', '2026-06-17 20:00:00-03', 'group', 'C'),
('Marrocos', 'Escócia', '🇲🇦', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '2026-06-17 17:00:00-03', 'group', 'C'),
('Brasil', 'Escócia', '🇧🇷', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '2026-06-21 20:00:00-03', 'group', 'C'),
('Haiti', 'Marrocos', '🇭🇹', '🇲🇦', '2026-06-21 20:00:00-03', 'group', 'C');

-- Grupo D: Estados Unidos, Paraguai, Austrália, Turquia
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage, group_name) values
('Estados Unidos', 'Paraguai', '🇺🇸', '🇵🇾', '2026-06-14 20:00:00-03', 'group', 'D'),
('Austrália', 'Turquia', '🇦🇺', '🇹🇷', '2026-06-14 23:00:00-03', 'group', 'D'),
('Estados Unidos', 'Austrália', '🇺🇸', '🇦🇺', '2026-06-18 20:00:00-03', 'group', 'D'),
('Paraguai', 'Turquia', '🇵🇾', '🇹🇷', '2026-06-18 17:00:00-03', 'group', 'D'),
('Estados Unidos', 'Turquia', '🇺🇸', '🇹🇷', '2026-06-22 20:00:00-03', 'group', 'D'),
('Paraguai', 'Austrália', '🇵🇾', '🇦🇺', '2026-06-22 20:00:00-03', 'group', 'D');

-- Grupo E: Alemanha, Curaçao, Costa do Marfim, Equador
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage, group_name) values
('Alemanha', 'Curaçao', '🇩🇪', '🇨🇼', '2026-06-14 17:00:00-03', 'group', 'E'),
('Costa do Marfim', 'Equador', '🇨🇮', '🇪🇨', '2026-06-15 20:00:00-03', 'group', 'E'),
('Alemanha', 'Costa do Marfim', '🇩🇪', '🇨🇮', '2026-06-18 23:00:00-03', 'group', 'E'),
('Curaçao', 'Equador', '🇨🇼', '🇪🇨', '2026-06-18 20:00:00-03', 'group', 'E'),
('Alemanha', 'Equador', '🇩🇪', '🇪🇨', '2026-06-22 17:00:00-03', 'group', 'E'),
('Curaçao', 'Costa do Marfim', '🇨🇼', '🇨🇮', '2026-06-22 17:00:00-03', 'group', 'E');

-- Grupo F: Holanda, Japão, Suécia, Tunísia
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage, group_name) values
('Holanda', 'Japão', '🇳🇱', '🇯🇵', '2026-06-15 23:00:00-03', 'group', 'F'),
('Suécia', 'Tunísia', '🇸🇪', '🇹🇳', '2026-06-15 17:00:00-03', 'group', 'F'),
('Holanda', 'Suécia', '🇳🇱', '🇸🇪', '2026-06-19 23:00:00-03', 'group', 'F'),
('Japão', 'Tunísia', '🇯🇵', '🇹🇳', '2026-06-19 17:00:00-03', 'group', 'F'),
('Holanda', 'Tunísia', '🇳🇱', '🇹🇳', '2026-06-23 20:00:00-03', 'group', 'F'),
('Japão', 'Suécia', '🇯🇵', '🇸🇪', '2026-06-23 20:00:00-03', 'group', 'F');

-- Grupo G: Bélgica, Egito, Irã, Nova Zelândia
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage, group_name) values
('Bélgica', 'Egito', '🇧🇪', '🇪🇬', '2026-06-16 23:00:00-03', 'group', 'G'),
('Irã', 'Nova Zelândia', '🇮🇷', '🇳🇿', '2026-06-16 17:00:00-03', 'group', 'G'),
('Bélgica', 'Irã', '🇧🇪', '🇮🇷', '2026-06-20 23:00:00-03', 'group', 'G'),
('Egito', 'Nova Zelândia', '🇪🇬', '🇳🇿', '2026-06-20 17:00:00-03', 'group', 'G'),
('Bélgica', 'Nova Zelândia', '🇧🇪', '🇳🇿', '2026-06-24 20:00:00-03', 'group', 'G'),
('Egito', 'Irã', '🇪🇬', '🇮🇷', '2026-06-24 20:00:00-03', 'group', 'G');

-- Grupo H: Espanha, Cabo Verde, Arábia Saudita, Uruguai
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage, group_name) values
('Espanha', 'Cabo Verde', '🇪🇸', '🇨🇻', '2026-06-17 23:00:00-03', 'group', 'H'),
('Arábia Saudita', 'Uruguai', '🇸🇦', '🇺🇾', '2026-06-17 17:00:00-03', 'group', 'H'),
('Espanha', 'Arábia Saudita', '🇪🇸', '🇸🇦', '2026-06-21 23:00:00-03', 'group', 'H'),
('Cabo Verde', 'Uruguai', '🇨🇻', '🇺🇾', '2026-06-21 17:00:00-03', 'group', 'H'),
('Espanha', 'Uruguai', '🇪🇸', '🇺🇾', '2026-06-25 20:00:00-03', 'group', 'H'),
('Cabo Verde', 'Arábia Saudita', '🇨🇻', '🇸🇦', '2026-06-25 20:00:00-03', 'group', 'H');

-- Grupo I: França, Senegal, Iraque, Noruega
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage, group_name) values
('França', 'Senegal', '🇫🇷', '🇸🇳', '2026-06-18 23:00:00-03', 'group', 'I'),
('Iraque', 'Noruega', '🇮🇶', '🇳🇴', '2026-06-18 17:00:00-03', 'group', 'I'),
('França', 'Iraque', '🇫🇷', '🇮🇶', '2026-06-22 23:00:00-03', 'group', 'I'),
('Senegal', 'Noruega', '🇸🇳', '🇳🇴', '2026-06-22 17:00:00-03', 'group', 'I'),
('França', 'Noruega', '🇫🇷', '🇳🇴', '2026-06-26 20:00:00-03', 'group', 'I'),
('Senegal', 'Iraque', '🇸🇳', '🇮🇶', '2026-06-26 20:00:00-03', 'group', 'I');

-- Grupo J: Argentina, Argélia, Áustria, Jordânia
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage, group_name) values
('Argentina', 'Argélia', '🇦🇷', '🇩🇿', '2026-06-19 17:00:00-03', 'group', 'J'),
('Áustria', 'Jordânia', '🇦🇹', '🇯🇴', '2026-06-19 23:00:00-03', 'group', 'J'),
('Argentina', 'Áustria', '🇦🇷', '🇦🇹', '2026-06-23 17:00:00-03', 'group', 'J'),
('Argélia', 'Jordânia', '🇩🇿', '🇯🇴', '2026-06-23 23:00:00-03', 'group', 'J'),
('Argentina', 'Jordânia', '🇦🇷', '🇯🇴', '2026-06-27 20:00:00-03', 'group', 'J'),
('Argélia', 'Áustria', '🇩🇿', '🇦🇹', '2026-06-27 20:00:00-03', 'group', 'J');

-- Grupo K: Portugal, Congo (RD), Uzbequistão, Colômbia
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage, group_name) values
('Portugal', 'Congo (RD)', '🇵🇹', '🇨🇩', '2026-06-20 17:00:00-03', 'group', 'K'),
('Uzbequistão', 'Colômbia', '🇺🇿', '🇨🇴', '2026-06-20 23:00:00-03', 'group', 'K'),
('Portugal', 'Uzbequistão', '🇵🇹', '🇺🇿', '2026-06-24 17:00:00-03', 'group', 'K'),
('Congo (RD)', 'Colômbia', '🇨🇩', '🇨🇴', '2026-06-24 23:00:00-03', 'group', 'K'),
('Portugal', 'Colômbia', '🇵🇹', '🇨🇴', '2026-06-28 20:00:00-03', 'group', 'K'),
('Congo (RD)', 'Uzbequistão', '🇨🇩', '🇺🇿', '2026-06-28 20:00:00-03', 'group', 'K');

-- Grupo L: Inglaterra, Croácia, Gana, Panamá
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage, group_name) values
('Inglaterra', 'Croácia', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇭🇷', '2026-06-21 17:00:00-03', 'group', 'L'),
('Gana', 'Panamá', '🇬🇭', '🇵🇦', '2026-06-21 23:00:00-03', 'group', 'L'),
('Inglaterra', 'Gana', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇬🇭', '2026-06-25 17:00:00-03', 'group', 'L'),
('Croácia', 'Panamá', '🇭🇷', '🇵🇦', '2026-06-25 23:00:00-03', 'group', 'L'),
('Inglaterra', 'Panamá', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇵🇦', '2026-06-29 20:00:00-03', 'group', 'L'),
('Croácia', 'Gana', '🇭🇷', '🇬🇭', '2026-06-29 20:00:00-03', 'group', 'L');

-- ============================================================
-- Fase Eliminatória – Times TBD (atualizar após fase de grupos)
-- ============================================================

-- Rodada dos 32 (16 jogos) – Jun 28 – Jul 3
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage) values
('TBD', 'TBD', '🏳️', '🏳️', '2026-06-29 17:00:00-03', 'round_of_32'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-06-29 21:00:00-03', 'round_of_32'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-06-30 17:00:00-03', 'round_of_32'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-06-30 21:00:00-03', 'round_of_32'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-01 17:00:00-03', 'round_of_32'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-01 21:00:00-03', 'round_of_32'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-02 17:00:00-03', 'round_of_32'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-02 21:00:00-03', 'round_of_32'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-03 17:00:00-03', 'round_of_32'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-03 21:00:00-03', 'round_of_32'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-04 17:00:00-03', 'round_of_32'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-04 21:00:00-03', 'round_of_32'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-05 17:00:00-03', 'round_of_32'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-05 21:00:00-03', 'round_of_32'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-06 17:00:00-03', 'round_of_32'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-06 21:00:00-03', 'round_of_32');

-- Oitavas de Final (8 jogos) – Jul 7-10
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage) values
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-07 20:00:00-03', 'round_of_16'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-08 20:00:00-03', 'round_of_16'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-08 23:00:00-03', 'round_of_16'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-09 20:00:00-03', 'round_of_16'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-09 23:00:00-03', 'round_of_16'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-10 20:00:00-03', 'round_of_16'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-10 23:00:00-03', 'round_of_16'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-11 20:00:00-03', 'round_of_16');

-- Quartas de Final (4 jogos) – Jul 12-14
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage) values
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-12 20:00:00-03', 'quarterfinal'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-13 20:00:00-03', 'quarterfinal'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-13 23:00:00-03', 'quarterfinal'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-14 20:00:00-03', 'quarterfinal');

-- Semifinais (2 jogos) – Jul 16-17
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage) values
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-16 20:00:00-03', 'semifinal'),
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-17 20:00:00-03', 'semifinal');

-- Disputa de 3º Lugar – Jul 18
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage) values
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-18 16:00:00-03', 'third_place');

-- Grande Final – Jul 19
insert into public.matches (home_team, away_team, home_team_flag, away_team_flag, match_date, stage) values
('TBD', 'TBD', '🏳️', '🏳️', '2026-07-19 17:00:00-03', 'final');
