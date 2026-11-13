export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

/** Preview samples for the header modal only; full page starts empty. */
export const RECENT_NOTIFICATION_PREVIEW: NotificationItem[] = [
  {
    id: "n1",
    title: "محصول ذخیره شد",
    body: "محصول «تیشرت نخی» با موفقیت ثبت شد.",
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    read: false,
  },
  {
    id: "n2",
    title: "تکمیل اطلاعات",
    body: "۳ محصول هنوز فقط اطلاعات پایه دارند.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    read: false,
  },
  {
    id: "n3",
    title: "خوش آمدی",
    body: "پروفایل فروشگاهت آماده‌ست؛ اولین محصولت را اضافه کن.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    read: true,
  },
];
