CREATE TABLE db_component_fixture (
  id integer PRIMARY KEY,
  amount integer NOT NULL CHECK (amount >= 0)
);
