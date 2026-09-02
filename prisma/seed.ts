import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const category = await prisma.serviceCategory.upsert({
    where: { code: "HOME_CARE" },
    update: {},
    create: { code: "HOME_CARE", nameAr: "الرعاية المنزلية", nameEn: "Home care" }
  });
  const homeNursing = await prisma.service.upsert({
    where: { slug: "home-nursing" },
    update: {},
    create: {
      publicId: "01JHOME000000000000000001",
      slug: "home-nursing",
      categoryId: category.id,
      nameAr: "تمريض منزلي",
      nameEn: "Home nursing",
      descriptionAr: "زيارة تمريضية آمنة في المنزل",
      descriptionEn: "Safe nursing care at home",
      estimatedDurationMinutes: 45,
      basePriceMinor: 35000n,
      currency: "IQD",
      requiredProfession: "NURSE",
      supportsGenderPreference: true,
      questions: {
        create: [
          { questionKey: "careReason", type: "single_choice", labelAr: "ما نوع المساعدة المطلوبة؟", labelEn: "What help is needed?", required: true, sortOrder: 1 },
          { questionKey: "mobility", type: "single_choice", labelAr: "هل يستطيع المريض الحركة؟", labelEn: "Can the patient move independently?", required: true, sortOrder: 2 },
          { questionKey: "emergencySigns", type: "multi_choice", labelAr: "هل توجد علامات خطرة الآن؟", labelEn: "Are emergency signs present?", safetyType: "RED_FLAG", sortOrder: 3 }
        ]
      }
    }
  });
  console.info(`Seeded fictional service catalog: ${homeNursing.slug}`);
}

main().finally(async () => prisma.$disconnect());

