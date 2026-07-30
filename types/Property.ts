export type Property = {
  id: string;
  tenant_id: string;
  customer_id: string | null;

  property_name: string | null;

  address_line_1: string;
  address_line_2: string | null;

  city: string;
  state: string;
  postal_code: string | null;

  parcel_number: string | null;

  property_contact_name: string | null;
  property_contact_email: string | null;
  property_contact_phone: string | null;

  notes: string | null;

  is_active: boolean;

  created_at: string;
};