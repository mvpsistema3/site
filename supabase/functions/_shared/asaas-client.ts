/**
 * Asaas API HTTP Client
 * Handles all communication with the Asaas payment gateway.
 */

const ASAAS_BASE_URL = Deno.env.get("ASAAS_BASE_URL") || "https://sandbox.asaas.com/api/v3";
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;

interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone?: string;
}

interface AsaasPayment {
  id: string;
  status: string;
  value: number;
  billingType: string;
  invoiceUrl: string;
  installmentCount?: number;
  installmentValue?: number;
}

interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

interface CreatePaymentParams {
  customer: string;
  billingType: "PIX" | "CREDIT_CARD";
  value: number;
  dueDate: string;
  description: string;
  externalReference: string;
  installmentCount?: number;
  installmentValue?: number;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    cpfCnpj: string;
    email: string;
    phone: string;
    postalCode: string;
    addressNumber: string;
  };
  remoteIp?: string;
}

async function asaasFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${ASAAS_BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    "access_token": ASAAS_API_KEY,
    ...options.headers,
  };

  return fetch(url, { ...options, headers });
}

/**
 * Find an existing Asaas customer by CPF/CNPJ, or create a new one.
 * Also saves/updates the mapping in the local asaas_customers table.
 */
export async function findOrCreateCustomer(
  supabaseAdmin: any,
  data: {
    cpfCnpj: string;
    name: string;
    email: string;
    mobilePhone?: string;
    userId?: string | null;
  }
): Promise<string> {
  const cleanCpf = data.cpfCnpj.replace(/\D/g, "");

  // 1. Check local cache first
  const { data: localCustomer } = await supabaseAdmin
    .from("asaas_customers")
    .select("asaas_id")
    .eq("cpf_cnpj", cleanCpf)
    .maybeSingle();

  if (localCustomer?.asaas_id) {
    console.log("Asaas customer found in local cache:", localCustomer.asaas_id);
    return localCustomer.asaas_id;
  }

  // 2. Search Asaas API by CPF
  const searchRes = await asaasFetch(`/customers?cpfCnpj=${cleanCpf}`);
  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.data?.length > 0) {
      const asaasId = searchData.data[0].id;
      console.log("Asaas customer found via API:", asaasId);

      // Save to local cache
      await supabaseAdmin.from("asaas_customers").upsert({
        asaas_id: asaasId,
        cpf_cnpj: cleanCpf,
        name: data.name,
        email: data.email,
        mobile_phone: data.mobilePhone,
        user_id: data.userId || null,
      }, { onConflict: "asaas_id" });

      return asaasId;
    }
  }

  // 3. Create new customer
  const createRes = await asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      cpfCnpj: cleanCpf,
      mobilePhone: data.mobilePhone?.replace(/\D/g, ""),
      externalReference: data.userId || `guest-${Date.now()}`,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    console.error("Failed to create Asaas customer:", err);

    let message = "Erro ao cadastrar cliente no gateway de pagamento";
    if (err.errors?.some((e: any) => e.code === "invalid_cpfCnpj")) {
      message = "CPF inválido. Por favor, verifique o CPF informado.";
    } else if (err.errors?.some((e: any) => e.code === "invalid_mobilePhone")) {
      message = "Telefone inválido. Por favor, verifique o telefone informado.";
    }
    throw new Error(message);
  }

  const created: AsaasCustomer = await createRes.json();
  console.log("Asaas customer created:", created.id);

  // Save to local cache
  await supabaseAdmin.from("asaas_customers").insert({
    asaas_id: created.id,
    cpf_cnpj: cleanCpf,
    name: data.name,
    email: data.email,
    mobile_phone: data.mobilePhone,
    user_id: data.userId || null,
  });

  return created.id;
}

/**
 * Create a payment in Asaas.
 */
export async function createPayment(params: CreatePaymentParams): Promise<AsaasPayment> {
  const payload: any = {
    customer: params.customer,
    billingType: params.billingType,
    dueDate: params.dueDate,
    description: params.description,
    externalReference: params.externalReference,
  };

  if (params.billingType === "PIX") {
    payload.value = params.value;
  } else if (params.billingType === "CREDIT_CARD") {
    if (params.installmentCount && params.installmentCount >= 2) {
      // Installments: send installmentCount + installmentValue (NOT value)
      payload.installmentCount = params.installmentCount;
      payload.installmentValue = params.installmentValue;
    } else {
      // Single payment: send value only (NO installmentCount)
      payload.value = params.value;
    }

    if (params.creditCard) {
      payload.creditCard = params.creditCard;
    }
    if (params.creditCardHolderInfo) {
      payload.creditCardHolderInfo = params.creditCardHolderInfo;
    }
    if (params.remoteIp) {
      payload.remoteIp = params.remoteIp;
    }
  }

  console.log("Creating Asaas payment:", JSON.stringify(payload, null, 2));

  const res = await asaasFetch("/payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const responseText = await res.text();

  if (!res.ok) {
    console.error("Asaas payment creation failed:", res.status, responseText);
    let errorData;
    try {
      errorData = JSON.parse(responseText);
    } catch {
      // not JSON
    }
    const error: any = new Error("Erro ao criar cobrança no Asaas");
    error.asaasStatus = res.status;
    error.asaasError = errorData || responseText;
    throw error;
  }

  return JSON.parse(responseText);
}

/**
 * Get PIX QR code for a payment.
 */
export async function getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  const res = await asaasFetch(`/payments/${paymentId}/pixQrCode`);

  if (!res.ok) {
    const err = await res.text();
    console.error("Failed to get PIX QR code:", err);
    throw new Error("Erro ao gerar QR Code PIX");
  }

  return res.json();
}
