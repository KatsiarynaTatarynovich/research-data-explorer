CREATE TABLE experiments (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
