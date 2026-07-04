export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json | null };

export interface Database {
  public: {
    tables: {
      users: {
        Row: {
          id: string;
          email: string;
          emailVerified: boolean;
          passwordHash: string;
          fullName: string;
          phone: string | null;
          role: string;
          createdAt: string;
          updatedAt: string;
          deletedAt: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          emailVerified?: boolean;
          passwordHash: string;
          fullName: string;
          phone?: string | null;
          role?: string;
          createdAt?: string;
          updatedAt?: string;
          deletedAt?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          emailVerified?: boolean;
          passwordHash?: string;
          fullName?: string;
          phone?: string | null;
          role?: string;
          createdAt?: string;
          updatedAt?: string;
          deletedAt?: string | null;
        };
      };
      verificationCodes: {
        Row: {
          id: string;
          userId: string;
          code: string;
          type: string;
          expiresAt: string;
          used: boolean;
          createdAt: string;
        };
        Insert: {
          id?: string;
          userId: string;
          code: string;
          type?: string;
          expiresAt: string;
          used?: boolean;
          createdAt?: string;
        };
        Update: {
          id?: string;
          userId?: string;
          code?: string;
          type?: string;
          expiresAt?: string;
          used?: boolean;
          createdAt?: string;
        };
      };
      auctions: {
        Row: {
          id: string;
          title: string;
          description: string;
          images: Json;
          startPrice: string;
          currentPrice: string;
          bidStep: string;
          duration: number;
          autoExtensionEnabled: boolean;
          maxExtensions: number;
          currentExtensionCount: number;
          status: string;
          sellerId: string;
          winnerId: string | null;
          createdAt: string;
          updatedAt: string;
          endsAt: string | null;
          deletedAt: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          images?: Json;
          startPrice: string;
          currentPrice?: string;
          bidStep?: string;
          duration?: number;
          autoExtensionEnabled?: boolean;
          maxExtensions?: number;
          currentExtensionCount?: number;
          status?: string;
          sellerId: string;
          winnerId?: string | null;
          createdAt?: string;
          updatedAt?: string;
          endsAt?: string | null;
          deletedAt?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          images?: Json;
          startPrice?: string;
          currentPrice?: string;
          bidStep?: string;
          duration?: number;
          autoExtensionEnabled?: boolean;
          maxExtensions?: number;
          currentExtensionCount?: number;
          status?: string;
          sellerId?: string;
          winnerId?: string | null;
          createdAt?: string;
          updatedAt?: string;
          endsAt?: string | null;
          deletedAt?: string | null;
        };
      };
      bids: {
        Row: {
          id: string;
          auctionId: string;
          userId: string;
          bidPrice: string;
          isAutoBid: boolean;
          autoBidMaxPrice: string | null;
          status: string;
          createdAt: string;
          updatedAt: string;
          deletedAt: string | null;
        };
        Insert: {
          id?: string;
          auctionId: string;
          userId: string;
          bidPrice: string;
          isAutoBid?: boolean;
          autoBidMaxPrice?: string | null;
          status?: string;
          createdAt?: string;
          updatedAt?: string;
          deletedAt?: string | null;
        };
        Update: {
          id?: string;
          auctionId?: string;
          userId?: string;
          bidPrice?: string;
          isAutoBid?: boolean;
          autoBidMaxPrice?: string | null;
          status?: string;
          createdAt?: string;
          updatedAt?: string;
          deletedAt?: string | null;
        };
      };
      auditLogs: {
        Row: {
          id: string;
          userId: string | null;
          action: string;
          resourceType: string;
          resourceId: string;
          oldValues: Json | null;
          newValues: Json | null;
          ipAddress: string | null;
          userAgent: string | null;
          createdAt: string;
        };
        Insert: {
          id?: string;
          userId?: string | null;
          action: string;
          resourceType: string;
          resourceId: string;
          oldValues?: Json | null;
          newValues?: Json | null;
          ipAddress?: string | null;
          userAgent?: string | null;
          createdAt?: string;
        };
        Update: {
          id?: string;
          userId?: string | null;
          action?: string;
          resourceType?: string;
          resourceId?: string;
          oldValues?: Json | null;
          newValues?: Json | null;
          ipAddress?: string | null;
          userAgent?: string | null;
          createdAt?: string;
        };
      };
    };
    functions: {
      [_ in string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
  };
}