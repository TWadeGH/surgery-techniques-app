CREATE TABLE admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  recipient_id uuid NOT NULL REFERENCES auth.users(id),
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_admin_messages_recipient ON admin_messages(recipient_id, read_at);
CREATE INDEX idx_admin_messages_conversation ON admin_messages(LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at DESC);
CREATE INDEX idx_admin_messages_created_at ON admin_messages(created_at);

ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own messages" ON admin_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Admins insert own messages" ON admin_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND is_admin(auth.uid()));

CREATE POLICY "Recipients can update read_at" ON admin_messages FOR UPDATE
  USING (auth.uid() = recipient_id);

ALTER PUBLICATION supabase_realtime ADD TABLE admin_messages;
