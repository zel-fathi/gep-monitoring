-- Additional constraints and optimizations

ALTER TABLE energy_data
  ADD CONSTRAINT consumption_positive CHECK (consumption >= 0);
