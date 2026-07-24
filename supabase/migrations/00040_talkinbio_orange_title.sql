-- The reserved "talkinbio" demo profile should show its name in the brand orange (--coral,
-- #FF6A5C — same as the landing page wordmark), not the neutral theme text color. page_title
-- now renders through the shared colored-text system (renderColoredSegments in ProfileHeader),
-- so we just store the name wrapped in the `[[text|#RRGGBB]]` markup the editor's color palette
-- also produces. Owners of other businesses can color their own title the same way from the
-- editor's "Sayfa Başlığı" field.
update public.businesses
set page_title = '[[talkinbio|#FF6A5C]]'
where username = 'talkinbio';
