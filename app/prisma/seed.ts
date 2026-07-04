// Prisma Seed Data for AutoBid.vn MVP Demo
import {
  AuditAction,
  AuctionStatus,
  NotificationType,
  Prisma,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_AUCTION_KEYS = [
  'Bức Tranh Sơn Mài "Hà Nội Xưa"',
  'Đồng Hồ Cổ Pháp 1920',
  'Điện Thoại Cổ Nokia 3310 EditionLIMITED',
  'Bộ Cà robes Thêu Tay Cổ Điển',
  'Bộ Bát Sứ Minh Hương Cũ',
  'Bức Gỗ Điêu Khắc "Rồng Phượng"',
  'Sách Cổ "Lịch sử Pháp 1945"',
] as const;

async function upsertProfile(data: {
  email: string;
  emailVerified: boolean;
  fullName: string;
  phone: string;
  role: UserRole;
  createdAt: Date;
  passwordHash?: string;
}) {
  const passwordHash = data.passwordHash || await bcrypt.hash('password123', 12);
  
  return prisma.profile.upsert({
    where: { email: data.email },
    update: {
      emailVerified: data.emailVerified,
      fullName: data.fullName,
      phone: data.phone,
      role: data.role,
      passwordHash,
    },
    create: {
      ...data,
      passwordHash,
    },
  });
}

async function main() {
  console.log('Starting seed...');

  const admin = await upsertProfile({
    email: 'admin@autobid.vn',
    emailVerified: true,
    fullName: 'Admin System',
    phone: '0900000000',
    role: UserRole.ADMIN,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  });

  const sellers = await Promise.all([
    upsertProfile({
      email: 'seller1@autobid.vn',
      emailVerified: true,
      fullName: 'Nguyen Van A',
      phone: '0911111111',
      role: UserRole.SELLER,
      createdAt: new Date('2026-01-02T00:00:00Z'),
    }),
    upsertProfile({
      email: 'seller2@autobid.vn',
      emailVerified: true,
      fullName: 'Tran Thi B',
      phone: '0922222222',
      role: UserRole.SELLER,
      createdAt: new Date('2026-01-03T00:00:00Z'),
    }),
    upsertProfile({
      email: 'seller3@autobid.vn',
      emailVerified: true,
      fullName: 'Le Van C',
      phone: '0933333333',
      role: UserRole.SELLER,
      createdAt: new Date('2026-01-04T00:00:00Z'),
    }),
  ]);

  const users = await Promise.all([
    upsertProfile({
      email: 'user1@autobid.vn',
      emailVerified: true,
      fullName: 'Pham Van X',
      phone: '0944444444',
      role: UserRole.USER,
      createdAt: new Date('2026-01-05T00:00:00Z'),
    }),
    upsertProfile({
      email: 'user2@autobid.vn',
      emailVerified: true,
      fullName: 'Hoang Thi Y',
      phone: '0955555555',
      role: UserRole.USER,
      createdAt: new Date('2026-01-06T00:00:00Z'),
    }),
    upsertProfile({
      email: 'user3@autobid.vn',
      emailVerified: true,
      fullName: 'Dinh Van Z',
      phone: '0966666666',
      role: UserRole.USER,
      createdAt: new Date('2026-01-07T00:00:00Z'),
    }),
    upsertProfile({
      email: 'user4@autobid.vn',
      emailVerified: true,
      fullName: 'Vu Thi W',
      phone: '0977777777',
      role: UserRole.USER,
      createdAt: new Date('2026-01-08T00:00:00Z'),
    }),
  ]);

  console.log('Upserted profiles:', {
    admin: admin.email,
    sellers: sellers.length,
    users: users.length,
  });

  const auctionsData = [
    {
      title: DEMO_AUCTION_KEYS[0],
      description:
        'Bức tranh sơn mài handmade bởi nghệ nhân nổi tiếng, phong cách cổ điển, kích thước 60x80cm. Tuyệt phẩm nghệ thuật để trang trí phòng khách sang trọng.',
      startPrice: BigInt(5000000),
      bidStep: BigInt(100000),
      durationMinutes: 30,
      status: AuctionStatus.COMPLETED,
      sellerId: sellers[0].id,
      startsAt: new Date('2026-06-15T10:00:00Z'),
      endsAt: new Date('2026-06-15T10:30:00Z'),
    },
    {
      title: DEMO_AUCTION_KEYS[1],
      description:
        'Đồng hồ treo tường cổ Pháp nguyên bản, mặt số kim loại mạ vàng, cơ chế hoạt động tốt. Mặt hàng sưu tầm hiếm có.',
      startPrice: BigInt(8000000),
      bidStep: BigInt(200000),
      durationMinutes: 45,
      status: AuctionStatus.COMPLETED,
      sellerId: sellers[1].id,
      startsAt: new Date('2026-06-20T14:00:00Z'),
      endsAt: new Date('2026-06-20T14:45:00Z'),
    },
    {
      title: DEMO_AUCTION_KEYS[2],
      description:
        'Điện thoại Nokia 3310 phiên bản giới hạn màu vàng kim, còn nguyên seal, hộp và phụ kiện đầy đủ. Thiết bị bền bỉ kinh điển.',
      startPrice: BigInt(3000000),
      bidStep: BigInt(50000),
      durationMinutes: 20,
      status: AuctionStatus.ACTIVE,
      sellerId: sellers[2].id,
      startsAt: new Date('2026-06-25T09:00:00Z'),
      endsAt: null,
    },
    {
      title: DEMO_AUCTION_KEYS[3],
      description:
        'Bộ cà robes thêu tay công phu, chất liệu lụa cao cấp, phù hợp cho các sự kiện trang trọng. Mỗi bộ là một tác phẩm nghệ thuật.',
      startPrice: BigInt(1500000),
      bidStep: BigInt(50000),
      durationMinutes: 25,
      status: AuctionStatus.ACTIVE,
      sellerId: sellers[0].id,
      startsAt: new Date('2026-06-28T15:00:00Z'),
      endsAt: null,
    },
    {
      title: DEMO_AUCTION_KEYS[4],
      description:
        'Bộ 6 bát sứ Minh Hương cổ, họa tiết hoa sen tinh xảo, màu men vàng ấm. Đồ sưu tầm, giá trị văn hóa cao.',
      startPrice: BigInt(2000000),
      bidStep: BigInt(100000),
      durationMinutes: 30,
      status: AuctionStatus.PENDING,
      sellerId: sellers[1].id,
      startsAt: null,
      endsAt: null,
    },
    {
      title: DEMO_AUCTION_KEYS[5],
      description:
        'Tấm gỗ điêu khắc tinh xảo hình rồng phượng, chất liệu gỗ gụ tự nhiên, kích thước 100x60cm. Tác phẩm nghệ thuật dân gian.',
      startPrice: BigInt(7000000),
      bidStep: BigInt(200000),
      durationMinutes: 40,
      status: AuctionStatus.PENDING,
      sellerId: sellers[2].id,
      startsAt: null,
      endsAt: null,
    },
    {
      title: DEMO_AUCTION_KEYS[6],
      description:
        'Quyển lịch sử Pháp năm 1945 in cổ, bìa da, còn nguyên bao bọc. Sách quý cho bộ sưu tập.',
      startPrice: BigInt(1000000),
      bidStep: BigInt(50000),
      durationMinutes: 15,
      status: AuctionStatus.PENDING,
      sellerId: sellers[0].id,
      startsAt: null,
      endsAt: null,
    },
  ] satisfies Array<
    Pick<
      Prisma.AuctionCreateInput,
      | 'title'
      | 'description'
      | 'startPrice'
      | 'bidStep'
      | 'durationMinutes'
      | 'status'
      | 'startsAt'
      | 'endsAt'
    > & { sellerId: string }
  >;

  const auctions = await Promise.all(
    auctionsData.map(async (auction) => {
      const existingAuction = await prisma.auction.findFirst({
        where: { title: auction.title },
      });

      if (existingAuction) {
        return prisma.auction.update({
          where: { id: existingAuction.id },
          data: {
            description: auction.description,
            startPrice: auction.startPrice,
            bidStep: auction.bidStep,
            durationMinutes: auction.durationMinutes,
            status: auction.status,
            sellerId: auction.sellerId,
            startsAt: auction.startsAt,
            endsAt: auction.endsAt,
          },
        });
      }

      return prisma.auction.create({
        data: {
          title: auction.title,
          description: auction.description,
          startPrice: auction.startPrice,
          currentPrice: BigInt(0),
          bidStep: auction.bidStep,
          durationMinutes: auction.durationMinutes,
          autoExtensionEnabled: true,
          maxExtensions: 3,
          currentExtensionCount: 0,
          status: auction.status,
          sellerId: auction.sellerId,
          startsAt: auction.startsAt,
          endsAt: auction.endsAt,
        },
      });
    }),
  );

  console.log('Upserted auctions:', auctions.length);

  const auctionByTitle = new Map(auctions.map((auction) => [auction.title, auction]));

  const bidInputs = [
    {
      auctionTitle: DEMO_AUCTION_KEYS[0],
      bidderId: users[0].id,
      amount: BigInt(5000000),
      isAutoBid: false,
      autoBidMaxPrice: null,
    },
    {
      auctionTitle: DEMO_AUCTION_KEYS[0],
      bidderId: users[1].id,
      amount: BigInt(5500000),
      isAutoBid: true,
      autoBidMaxPrice: BigInt(6000000),
    },
    {
      auctionTitle: DEMO_AUCTION_KEYS[0],
      bidderId: users[2].id,
      amount: BigInt(6000000),
      isAutoBid: false,
      autoBidMaxPrice: null,
    },
    {
      auctionTitle: DEMO_AUCTION_KEYS[0],
      bidderId: users[0].id,
      amount: BigInt(6200000),
      isAutoBid: true,
      autoBidMaxPrice: BigInt(7000000),
    },
    {
      auctionTitle: DEMO_AUCTION_KEYS[0],
      bidderId: users[1].id,
      amount: BigInt(7000000),
      isAutoBid: false,
      autoBidMaxPrice: null,
    },
    {
      auctionTitle: DEMO_AUCTION_KEYS[1],
      bidderId: users[2].id,
      amount: BigInt(8000000),
      isAutoBid: false,
      autoBidMaxPrice: null,
    },
    {
      auctionTitle: DEMO_AUCTION_KEYS[1],
      bidderId: users[3].id,
      amount: BigInt(8500000),
      isAutoBid: false,
      autoBidMaxPrice: null,
    },
    {
      auctionTitle: DEMO_AUCTION_KEYS[2],
      bidderId: users[0].id,
      amount: BigInt(3000000),
      isAutoBid: false,
      autoBidMaxPrice: null,
    },
    {
      auctionTitle: DEMO_AUCTION_KEYS[2],
      bidderId: users[1].id,
      amount: BigInt(3100000),
      isAutoBid: true,
      autoBidMaxPrice: BigInt(3500000),
    },
    {
      auctionTitle: DEMO_AUCTION_KEYS[2],
      bidderId: users[2].id,
      amount: BigInt(3400000),
      isAutoBid: false,
      autoBidMaxPrice: null,
    },
    {
      auctionTitle: DEMO_AUCTION_KEYS[3],
      bidderId: users[3].id,
      amount: BigInt(1500000),
      isAutoBid: false,
      autoBidMaxPrice: null,
    },
  ];

  const bidResults = await Promise.all(
    bidInputs.map((bid) => {
      const auction = auctionByTitle.get(bid.auctionTitle);

      if (!auction) {
        throw new Error(`Missing demo auction: ${bid.auctionTitle}`);
      }

      return prisma.bid
        .findFirst({
          where: {
            auctionId: auction.id,
            bidderId: bid.bidderId,
            amount: bid.amount,
          },
        })
        .then((existingBid) => {
          if (existingBid) {
            return prisma.bid.update({
              where: { id: existingBid.id },
              data: {
                isAutoBid: bid.isAutoBid,
                autoBidMaxPrice: bid.autoBidMaxPrice,
                status: 'ACTIVE',
                deletedAt: null,
              },
            });
          }

          return prisma.bid.create({
            data: {
              auctionId: auction.id,
              bidderId: bid.bidderId,
              amount: bid.amount,
              isAutoBid: bid.isAutoBid,
              autoBidMaxPrice: bid.autoBidMaxPrice,
            },
          });
        });
    }),
  );

  console.log('Upserted bids:', bidResults.length);

  await Promise.all(
    auctions.map(async (auction) => {
      const highestBid = await prisma.bid.findFirst({
        where: {
          auctionId: auction.id,
          status: 'ACTIVE',
          deletedAt: null,
        },
        orderBy: {
          amount: 'desc',
        },
        select: {
          amount: true,
          bidderId: true,
        },
      });

      return prisma.auction.update({
        where: { id: auction.id },
        data: {
          currentPrice: highestBid?.amount ?? BigInt(0),
          winnerId:
            auction.status === AuctionStatus.COMPLETED ? highestBid?.bidderId ?? null : null,
        },
      });
    }),
  );

  console.log('Updated auction current prices');

  const watchlistInputs = [
    { profileId: users[0].id, auctionTitle: DEMO_AUCTION_KEYS[2] },
    { profileId: users[1].id, auctionTitle: DEMO_AUCTION_KEYS[3] },
    { profileId: users[2].id, auctionTitle: DEMO_AUCTION_KEYS[4] },
    { profileId: users[3].id, auctionTitle: DEMO_AUCTION_KEYS[5] },
  ];

  await Promise.all(
    watchlistInputs.map((watchlist) => {
      const auction = auctionByTitle.get(watchlist.auctionTitle);

      if (!auction) {
        throw new Error(`Missing demo auction: ${watchlist.auctionTitle}`);
      }

      return prisma.watchlist.upsert({
        where: {
          profileId_auctionId: {
            profileId: watchlist.profileId,
            auctionId: auction.id,
          },
        },
        update: {},
        create: {
          profileId: watchlist.profileId,
          auctionId: auction.id,
        },
      });
    }),
  );

  console.log('Upserted watchlist items:', watchlistInputs.length);

  const notificationsData: Prisma.NotificationCreateManyInput[] = [
    {
      profileId: admin.id,
      type: NotificationType.SYSTEM,
      title: 'Hệ thống đã sẵn sàng',
      message: 'Chào mừng bạn đến với AutoBid.vn!',
    },
    {
      profileId: sellers[0].id,
      type: NotificationType.AUCTION_CREATED,
      title: 'Phiên đấu giá mới',
      message: 'Bạn vừa tạo một phiên đấu giá mới.',
    },
  ];

  await prisma.notification.createMany({
    data: notificationsData,
    skipDuplicates: true,
  });

  console.log('Created notifications if missing:', notificationsData.length);

  const auditLogsData: Prisma.AuditLogCreateManyInput[] = [
    {
      profileId: admin.id,
      action: AuditAction.ADMIN_ACTION,
      resourceType: 'system',
      resourceId: admin.id,
      newValues: { action: 'system_setup_complete' },
    },
    {
      profileId: sellers[0].id,
      action: AuditAction.AUCTION_CREATED,
      resourceType: 'auction',
      resourceId: auctionByTitle.get(DEMO_AUCTION_KEYS[0])!.id,
      newValues: { title: DEMO_AUCTION_KEYS[0] },
    },
    {
      profileId: sellers[1].id,
      action: AuditAction.AUCTION_CREATED,
      resourceType: 'auction',
      resourceId: auctionByTitle.get(DEMO_AUCTION_KEYS[1])!.id,
      newValues: { title: DEMO_AUCTION_KEYS[1] },
    },
    {
      profileId: users[0].id,
      action: AuditAction.BID_PLACED,
      resourceType: 'bid',
      resourceId: bidResults[0].id,
      newValues: { amount: 5000000 },
    },
    {
      profileId: users[1].id,
      action: AuditAction.BID_PLACED,
      resourceType: 'bid',
      resourceId: bidResults[1].id,
      newValues: { amount: 5500000 },
    },
  ];

  await prisma.auditLog.createMany({
    data: auditLogsData,
    skipDuplicates: true,
  });

  console.log('Created audit logs if missing:', auditLogsData.length);
  console.log('Seed completed successfully!');
}

main()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });