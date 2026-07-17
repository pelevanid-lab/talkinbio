-- Faz 2.1: v2 kanal genişlemesi için genişleme noktası; v1'de hep 'web'.
alter table conversations add column channel text default 'web';
