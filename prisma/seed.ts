import { PrismaClient, UserRole, ProjectType, ProjectStatus, ProjectPriority, CommunicationType, ChangeRequestSource, ChangeRequestStatus, ChangeRequestImpact, InvoiceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedAdmin() {
  const adminPassword = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD ?? "admin123!",
    12
  );

  const admin = await prisma.user.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL ?? "admin@agency.nl" },
    update: {},
    create: {
      name: process.env.SEED_ADMIN_NAME ?? "Admin User",
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@agency.nl",
      passwordHash: adminPassword,
      role: UserRole.ADMIN,
    },
  });

  console.log(`✅ Admin account klaar: ${admin.email}`);
  return admin;
}

async function seedDemoData(admin: { id: string }) {
  const employeePassword = await bcrypt.hash("employee123!", 12);
  const financePassword = await bcrypt.hash("finance123!", 12);

  const devUser = await prisma.user.upsert({
    where: { email: "dev@agency.nl" },
    update: {},
    create: {
      name: "Sander Visser",
      email: "dev@agency.nl",
      passwordHash: employeePassword,
      role: UserRole.EMPLOYEE,
    },
  });

  await prisma.user.upsert({
    where: { email: "finance@agency.nl" },
    update: {},
    create: {
      name: "Laura de Groot",
      email: "finance@agency.nl",
      passwordHash: financePassword,
      role: UserRole.FINANCE,
    },
  });

  console.log("✅ Demo users created");

  // ─── Clients ──────────────────────────────────────────────────────────────
  const client1 = await prisma.client.upsert({
    where: { id: "client-bakkerij-jansen" },
    update: {},
    create: {
      id: "client-bakkerij-jansen",
      companyName: "Bakkerij Jansen B.V.",
      contactName: "Mark Jansen",
      email: "mark@bakkerijjansen.nl",
      phone: "+31 6 12345678",
      address: "Hoofdstraat 12, 1234 AB Amsterdam",
      notes: "Vaste klant sinds 2021. Prefereert contact via WhatsApp. Deadlines zijn belangrijk voor hen vanwege seizoensgebonden campagnes.",
      invoiceDetails: "Facturen naar administratie@bakkerijjansen.nl, t.a.v. Mark Jansen",
    },
  });

  const client2 = await prisma.client.upsert({
    where: { id: "client-stichting-duurzaam" },
    update: {},
    create: {
      id: "client-stichting-duurzaam",
      companyName: "Stichting Duurzaam Nederland",
      contactName: "Eva Martens",
      email: "eva.martens@duurzaamnederland.org",
      phone: "+31 20 7654321",
      address: "Keizersgracht 88, 1015 CT Amsterdam",
      notes: "Non-profit. Beperkt budget maar trouwe klant. Altijd goede briefings aanleveren.",
      invoiceDetails: "Facturen naar financien@duurzaamnederland.org",
    },
  });

  const client3 = await prisma.client.upsert({
    where: { id: "client-techstart-bv" },
    update: {},
    create: {
      id: "client-techstart-bv",
      companyName: "TechStart B.V.",
      contactName: "Robin de Vries",
      email: "robin@techstart.io",
      phone: "+31 6 98765432",
      address: "High Tech Campus 5, 5656 AE Eindhoven",
      notes: "Startup in de fintech sector. Goed in het communiceren van requirements. Snel betaler.",
      invoiceDetails: "Facturen naar robin@techstart.io",
    },
  });

  const client4 = await prisma.client.upsert({
    where: { id: "client-hotel-atlantis" },
    update: {},
    create: {
      id: "client-hotel-atlantis",
      companyName: "Hotel Atlantis Rotterdam",
      contactName: "Sandra Koops",
      email: "s.koops@hotelatlantis.nl",
      phone: "+31 10 4567890",
      address: "Maasboulevard 1, 3063 NS Rotterdam",
      notes: "Hotelketen met 3 locaties. Wil een booking-widget geïntegreerd op de nieuwe site.",
    },
  });

  console.log("✅ Demo clients created");

  // ─── Projects ─────────────────────────────────────────────────────────────
  const project1 = await prisma.projectWorkspace.upsert({
    where: { slug: "bakkerij-jansen-nieuwe-website" },
    update: {},
    create: {
      id: "project-bakkerij-jansen-web",
      clientId: client1.id,
      name: "Bakkerij Jansen – Nieuwe Website",
      slug: "bakkerij-jansen-nieuwe-website",
      projectType: ProjectType.NEW_WEBSITE,
      status: ProjectStatus.IN_PROGRESS,
      priority: ProjectPriority.HIGH,
      description: "Complete nieuwe website voor Bakkerij Jansen, inclusief webshop voor online bestellingen van brood en banket.",
      intakeSummary: "Klant wil een moderne, snel ladende website met een eigen webshop. Producten en prijzen worden door de klant zelf beheerd. Integratie met iDEAL en Stripe vereist.",
      scope: "Homepage, over ons, producten pagina, webshop (WooCommerce), contact, blog. SEO-optimalisatie. Mobiel-first design.",
      techStack: "WordPress, WooCommerce, Elementor Pro, Yoast SEO",
      domainName: "bakkerijjansen.nl",
      hostingInfo: "Versio.nl – Hosting Plus pakket. cPanel beschikbaar.",
      startDate: new Date("2025-11-01"),
      ownerUserId: devUser.id,
      tags: ["wordpress", "webshop", "woocommerce"],
    },
  });

  const project2 = await prisma.projectWorkspace.upsert({
    where: { slug: "duurzaam-nederland-redesign" },
    update: {},
    create: {
      id: "project-duurzaam-redesign",
      clientId: client2.id,
      name: "Duurzaam Nederland – Website Redesign",
      slug: "duurzaam-nederland-redesign",
      projectType: ProjectType.REDESIGN,
      status: ProjectStatus.WAITING_FOR_CLIENT,
      priority: ProjectPriority.MEDIUM,
      description: "Redesign van de bestaande website. Focus op betere SEO, modern design en betere donatiefunctionaliteit.",
      intakeSummary: "De huidige site is verouderd (2018) en niet mobielvriendelijk. Klant wil een fris design, betere structuur en een donatieknop die werkt met Mollie.",
      scope: "Nieuwe homepage, over ons, projecten, doneren pagina, nieuws/blog, contact. Niet: volledige CMS-training (aparte offerte).",
      techStack: "WordPress, GeneratePress, Mollie plugin",
      domainName: "duurzaamnederland.org",
      hostingInfo: "Antagonist – SSD Hosting. SFTP beschikbaar.",
      startDate: new Date("2026-01-15"),
      ownerUserId: admin.id,
      tags: ["wordpress", "redesign", "non-profit"],
    },
  });

  const project3 = await prisma.projectWorkspace.upsert({
    where: { slug: "techstart-landing-page" },
    update: {},
    create: {
      id: "project-techstart-landing",
      clientId: client3.id,
      name: "TechStart – Launch Landing Page",
      slug: "techstart-landing-page",
      projectType: ProjectType.LANDING_PAGE,
      status: ProjectStatus.REVIEW,
      priority: ProjectPriority.URGENT,
      description: "Single-page landing site voor de product launch van TechStart's nieuwe fintech app. CTA-gericht, hoge conversie.",
      intakeSummary: "Klant lanceert hun MVP op 1 april. Landing page moet er professioneel uitzien met e-mail capture formulier (Mailchimp) en video embed.",
      scope: "1 pagina: hero, features, social proof, early access form, footer. Geen blog, geen aparte pagina's.",
      techStack: "Next.js, Tailwind CSS, Vercel, Mailchimp API",
      domainName: "app.techstart.io",
      hostingInfo: "Vercel – Pro plan. GitHub Actions voor CI/CD.",
      startDate: new Date("2026-02-15"),
      ownerUserId: devUser.id,
      tags: ["nextjs", "landing-page", "fintech", "urgent"],
    },
  });

  await prisma.projectWorkspace.upsert({
    where: { slug: "hotel-atlantis-maintenance" },
    update: {},
    create: {
      id: "project-atlantis-maintenance",
      clientId: client4.id,
      name: "Hotel Atlantis – Onderhoud & Updates",
      slug: "hotel-atlantis-maintenance",
      projectType: ProjectType.MAINTENANCE,
      status: ProjectStatus.MAINTENANCE,
      priority: ProjectPriority.LOW,
      description: "Maandelijks onderhoud en updates van de bestaande hotelwebsite. Plugin updates, content wijzigingen, performance monitoring.",
      scope: "Maandelijks: plugin updates, backup verificatie, performance check, max. 2 uur content wijzigingen.",
      techStack: "WordPress, Divi Builder",
      domainName: "hotelatlantis.nl",
      hostingInfo: "TransIP – BladeVPS X4. Plesk beschikbaar.",
      startDate: new Date("2024-06-01"),
      ownerUserId: devUser.id,
      tags: ["wordpress", "maintenance", "onderhoud"],
    },
  });

  console.log("✅ Demo projects created");

  // ─── Repositories ─────────────────────────────────────────────────────────
  await prisma.projectRepository.upsert({
    where: { id: "repo-techstart-landing" },
    update: {},
    create: {
      id: "repo-techstart-landing",
      projectId: project3.id,
      provider: "github",
      repoName: "agency-os/techstart-landing",
      repoUrl: "https://github.com/agency-os/techstart-landing",
      defaultBranch: "main",
      issueBoardUrl: "https://github.com/agency-os/techstart-landing/issues",
    },
  });

  await prisma.projectRepository.upsert({
    where: { id: "repo-bakkerij-jansen" },
    update: {},
    create: {
      id: "repo-bakkerij-jansen",
      projectId: project1.id,
      provider: "github",
      repoName: "agency-os/bakkerij-jansen",
      repoUrl: "https://github.com/agency-os/bakkerij-jansen",
      defaultBranch: "develop",
      issueBoardUrl: "https://github.com/agency-os/bakkerij-jansen/issues",
    },
  });

  // ─── Communication entries ─────────────────────────────────────────────────
  const comm1 = await prisma.communicationEntry.create({
    data: {
      projectId: project1.id,
      authorUserId: admin.id,
      type: CommunicationType.EMAIL,
      subject: "Akkoord op ontwerp v2",
      content: `Van: Mark Jansen <mark@bakkerijjansen.nl>\nAan: ons@agency.nl\n\nGoedemiddag,\n\nIk heb het tweede ontwerp bekeken en ik ben er erg blij mee!`,
      externalSenderName: "Mark Jansen",
      externalSenderEmail: "mark@bakkerijjansen.nl",
      isInternal: false,
      occurredAt: new Date("2026-02-10T14:30:00"),
    },
  });

  await prisma.communicationEntry.create({
    data: {
      projectId: project2.id,
      authorUserId: admin.id,
      type: CommunicationType.EMAIL,
      subject: "Wachten op tekstmateriaal van klant",
      content: "Interne notitie: Eva heeft beloofd de teksten voor 7 maart aan te leveren.",
      isInternal: true,
      occurredAt: new Date("2026-03-01T09:00:00"),
    },
  });

  // ─── Change Requests ───────────────────────────────────────────────────────
  const cr1 = await prisma.changeRequest.create({
    data: {
      projectId: project1.id,
      title: "Logo groter maken in header",
      description: "Klant heeft gevraagd het logo in de header groter te maken. Momenteel is het 120px breed, klant wil minimaal 160px.",
      sourceType: ChangeRequestSource.EMAIL,
      status: ChangeRequestStatus.IN_PROGRESS,
      impact: ChangeRequestImpact.SMALL,
      createdByUserId: admin.id,
      assignedToUserId: devUser.id,
      communications: { connect: [{ id: comm1.id }] },
    },
  });

  await prisma.changeRequest.create({
    data: {
      projectId: project3.id,
      title: "Hero tekst overflow fix op iPhone",
      description: "Op iPhone 13 (375px viewport) is de hero heading te groot en loopt buiten het scherm.",
      sourceType: ChangeRequestSource.EMAIL,
      status: ChangeRequestStatus.IN_PROGRESS,
      impact: ChangeRequestImpact.MEDIUM,
      createdByUserId: devUser.id,
      assignedToUserId: devUser.id,
      githubBranch: "fix/hero-mobile-overflow",
    },
  });

  // ─── Internal Notes ────────────────────────────────────────────────────────
  await prisma.internalNote.createMany({
    data: [
      {
        projectId: project1.id,
        authorUserId: devUser.id,
        content: "WooCommerce installatie klaar. Productenlijst van klant nog niet ontvangen.",
      },
      {
        projectId: project2.id,
        authorUserId: admin.id,
        content: "Let op: Eva is moeilijk bereikbaar. Altijd schriftelijk communiceren.",
      },
    ],
  });

  // ─── Invoices ──────────────────────────────────────────────────────────────
  await prisma.invoice.create({
    data: {
      id: "invoice-001",
      clientId: client1.id,
      projectId: project1.id,
      invoiceNumber: "2026-001",
      issueDate: new Date("2026-01-15"),
      dueDate: new Date("2026-02-14"),
      status: InvoiceStatus.PAID,
      subtotal: 1500.00,
      vatRate: 21,
      vatAmount: 315.00,
      totalAmount: 1815.00,
      description: "Aanbetaling 50% – Bakkerij Jansen Nieuwe Website",
      paidAt: new Date("2026-02-10"),
    },
  });

  await prisma.invoice.create({
    data: {
      id: "invoice-002",
      clientId: client3.id,
      projectId: project3.id,
      invoiceNumber: "2026-002",
      issueDate: new Date("2026-02-15"),
      dueDate: new Date("2026-03-16"),
      status: InvoiceStatus.OVERDUE,
      subtotal: 2400.00,
      vatRate: 21,
      vatAmount: 504.00,
      totalAmount: 2904.00,
      description: "TechStart Landing Page – Volledig bedrag",
    },
  });

  // ─── Audit Logs ───────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      {
        actorUserId: admin.id,
        entityType: "ProjectWorkspace",
        entityId: project1.id,
        action: "PROJECT_CREATED",
        metadataJson: { projectName: "Bakkerij Jansen – Nieuwe Website" },
      },
      {
        actorUserId: admin.id,
        entityType: "ChangeRequest",
        entityId: cr1.id,
        action: "CHANGE_REQUEST_CREATED",
        metadataJson: { title: "Logo groter maken in header" },
      },
    ],
  });

  console.log("✅ Demo data created");
  console.log("\n📧 Demo login credentials:");
  console.log("   Employee: dev@agency.nl / employee123!");
  console.log("   Finance:  finance@agency.nl / finance123!");
}

async function main() {
  const withDemo = process.env.SEED_DEMO_DATA === "true";

  console.log(`🌱 Seeding database... (demo data: ${withDemo ? "ja" : "nee"})`);

  const admin = await seedAdmin();

  if (withDemo) {
    await seedDemoData(admin);
  }

  console.log("\n🎉 Database seeded successfully!");
  console.log(`\n📧 Admin: ${process.env.SEED_ADMIN_EMAIL ?? "admin@agency.nl"} / ${process.env.SEED_ADMIN_PASSWORD ?? "admin123!"}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
