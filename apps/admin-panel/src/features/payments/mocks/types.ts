export type PaymentAccountStatus = "active" | "inactive";

export type MockPaymentAccount = {
  id: string;
  holderName: string;
  cardNumber: string | null;
  iban: string | null;
  bankName: string | null;
  label: string | null;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
};

export type PaymentStatus =
  | "AwaitingPayment"
  | "AwaitingReceiptReview"
  | "NeedsCorrection"
  | "Approved"
  | "Rejected"
  | "Expired"
  | "Cancelled";

export type ReceiptAttemptStatus = "Submitted" | "Approved" | "Rejected";

export type MockAccountSnapshot = {
  accountId: string;
  holderName: string;
  cardNumber: string | null;
  iban: string | null;
  bankName: string | null;
};

export type MockReceiptAttempt = {
  id: string;
  status: ReceiptAttemptStatus;
  mediaUrl: string;
  paidAmount: number;
  transferNote: string | null;
  payerName: string | null;
  submittedAt: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

export type MockReviewEvent = {
  id: string;
  action: "approve" | "reject" | "resubmit" | "created";
  at: string;
  by: string | null;
  reason: string | null;
};

export type MockDeposit = {
  id: string;
  invoiceNumber: string;
  userId: string;
  finalAmount: number;
  currency: "IRR";
  status: PaymentStatus;
  accountSnapshot: MockAccountSnapshot;
  attempts: MockReceiptAttempt[];
  history: MockReviewEvent[];
  createdAt: string;
  updatedAt: string;
};

export type PaymentsMockState = {
  accounts: MockPaymentAccount[];
  deposits: MockDeposit[];
};
