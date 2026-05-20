
import type { Timestamp } from 'firebase/firestore';

export interface PayoutRequest {
  id: string;
  userId: string;
  username: string;
  amount: number;
  method: 'bank' | 'paypal';
  details: {
    accountNo?: string;
    ifsc?: string;
    holderName?: string;
    paypalEmail?: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
