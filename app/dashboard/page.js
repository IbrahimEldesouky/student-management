"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    students: 0,
    groups: 0,
    todayPresent: 0,
    todayAbsent: 0,
    todayTotal: 0,
    due: 0,
    paid: 0,
    remaining: 0,
    attendancePercentage: 0,
    subscriptionsTotal: 0,
    subscriptionsPaid: 0,
    subscriptionsPartial: 0,
    subscriptionsUnpaid: 0,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/");
        return;
      }

      await loadDashboard();
    });

    return () => unsubscribe();
  }, [router]);

  const getToday = () => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
  };

  const getCurrentMonth = () => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    return year + "-" + month;
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const today = getToday();
      const currentMonth = getCurrentMonth();

      // =========================
      // الطلاب
      // =========================
      const studentsSnapshot = await getDocs(
        collection(db, "students")
      );

      const students = [];

      studentsSnapshot.forEach((doc) => {
        students.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      const activeStudents = students.filter(
        (student) => student.status === "active"
      );

      // =========================
      // المجموعات
      // =========================
      const groupsSnapshot = await getDocs(
        collection(db, "groups")
      );

      const groups = [];

      groupsSnapshot.forEach((doc) => {
        groups.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      // =========================
      // حضور اليوم
      // =========================
      const attendanceSnapshot = await getDocs(
        collection(db, "attendance")
      );

      let todayPresent = 0;
      let todayAbsent = 0;

      attendanceSnapshot.forEach((doc) => {
        const data = doc.data();

        if (data.date !== today) {
          return;
        }

        let records = [];

        if (Array.isArray(data.records)) {
          records = data.records;
        } else if (Array.isArray(data.attendance)) {
          records = data.attendance;
        } else if (Array.isArray(data.students)) {
          records = data.students;
        }

        records.forEach((record) => {
          const status = String(
            record.status || record.attendanceStatus || ""
          ).toLowerCase();

          if (
            status === "present" ||
            status === "حاضر" ||
            status === "حضور"
          ) {
            todayPresent++;
          }

          if (
            status === "absent" ||
            status === "غائب" ||
            status === "غياب"
          ) {
            todayAbsent++;
          }
        });
      });

      const todayTotal = todayPresent + todayAbsent;

      let attendancePercentage = 0;

      if (todayTotal > 0) {
        attendancePercentage = Math.round(
          (todayPresent / todayTotal) * 100
        );
      }

      // =========================
      // الاشتراكات
      // =========================
      const subscriptionsSnapshot = await getDocs(
        collection(db, "subscriptions")
      );

      let due = 0;
      let paid = 0;
      let remaining = 0;

      let subscriptionsTotal = 0;
      let subscriptionsPaid = 0;
      let subscriptionsPartial = 0;
      let subscriptionsUnpaid = 0;

      subscriptionsSnapshot.forEach((doc) => {
        const data = doc.data();

        if (data.month !== currentMonth) {
          return;
        }

        subscriptionsTotal++;

        const subscriptionDue = Number(
          data.dueAmount || 0
        );

        const subscriptionPaid = Number(
          data.totalPaid || data.paidAmount || 0
        );

        let subscriptionRemaining = Number(
          data.remainingAmount
        );

        if (isNaN(subscriptionRemaining)) {
          subscriptionRemaining =
            subscriptionDue - subscriptionPaid;
        }

        if (subscriptionRemaining < 0) {
          subscriptionRemaining = 0;
        }

        due += subscriptionDue;
        paid += subscriptionPaid;
        remaining += subscriptionRemaining;

        if (subscriptionRemaining <= 0) {
          subscriptionsPaid++;
        } else if (subscriptionPaid > 0) {
          subscriptionsPartial++;
        } else {
          subscriptionsUnpaid++;
        }
      });

      setStats({
        students: activeStudents.length,
        groups: groups.length,
        todayPresent: todayPresent,
        todayAbsent: todayAbsent,
        todayTotal: todayTotal,
        due: due,
        paid: paid,
        remaining: remaining,
        attendancePercentage: attendancePercentage,
        subscriptionsTotal: subscriptionsTotal,
        subscriptionsPaid: subscriptionsPaid,
        subscriptionsPartial: subscriptionsPartial,
        subscriptionsUnpaid: subscriptionsUnpaid,
      });
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/");
  };

  const formatMoney = (amount) => {
    return Number(amount || 0).toLocaleString("ar-EG");
  };

  const getCurrentMonthName = () => {
    return new Date().toLocaleDateString("ar-EG", {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100"
    >
      <div className="flex min-h-screen">

        {/* ================================================== */}
        {/* SIDEBAR */}
        {/* ================================================== */}

        <aside className="hidden w-72 shrink-0 border-l border-slate-200 bg-white lg:flex lg:flex-col">

          {/* Logo / Title */}
          <div className="border-b border-slate-100 p-6">

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-2xl text-white">
                🎓
              </div>

              <div>
                <h2 className="font-bold text-slate-800">
                  نظام إدارة الطلاب
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  لوحة الإدارة
                </p>
              </div>

            </div>

          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">

            <p className="mb-3 px-3 text-xs font-bold text-slate-400">
              الرئيسية
            </p>

            <button
              onClick={() =>
                router.push("/dashboard")
              }
              className="mb-1 flex w-full items-center gap-3 rounded-xl bg-slate-800 px-4 py-3 text-right font-medium text-white"
            >
              <span className="text-lg">🏠</span>
              <span>لوحة التحكم</span>
            </button>

            <div className="my-5 border-t border-slate-100"></div>

            <p className="mb-3 px-3 text-xs font-bold text-slate-400">
              إدارة الطلاب
            </p>

            <button
              onClick={() =>
                router.push("/dashboard/students")
              }
              className="mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
            >
              <span className="text-lg">👨‍🎓</span>
              <span>الطلاب</span>
            </button>

            <button
              onClick={() =>
                router.push("/dashboard/groups")
              }
              className="mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right font-medium text-slate-600 transition hover:bg-purple-50 hover:text-purple-700"
            >
              <span className="text-lg">👥</span>
              <span>المجموعات</span>
            </button>

            <div className="my-5 border-t border-slate-100"></div>

            <p className="mb-3 px-3 text-xs font-bold text-slate-400">
              التدريب والحضور
            </p>

            <button
              onClick={() =>
                router.push("/dashboard/attendance")
              }
              className="mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right font-medium text-slate-600 transition hover:bg-green-50 hover:text-green-700"
            >
              <span className="text-lg">✅</span>
              <span>تسجيل الحضور</span>
            </button>

            <button
              onClick={() =>
                router.push(
                  "/dashboard/attendance-report"
                )
              }
              className="mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right font-medium text-slate-600 transition hover:bg-orange-50 hover:text-orange-700"
            >
              <span className="text-lg">📊</span>
              <span>تقرير الحضور</span>
            </button>

            <div className="my-5 border-t border-slate-100"></div>

            <p className="mb-3 px-3 text-xs font-bold text-slate-400">
              الاشتراكات والماليات
            </p>

            <button
              onClick={() =>
                router.push(
                  "/dashboard/subscriptions"
                )
              }
              className="mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right font-medium text-slate-600 transition hover:bg-amber-50 hover:text-amber-700"
            >
              <span className="text-lg">💰</span>
              <span>الاشتراكات</span>
            </button>

            <button
              onClick={() =>
                router.push(
                  "/dashboard/financial-report"
                )
              }
              className="mb-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-right font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
            >
              <span className="text-lg">📈</span>
              <span>التقرير المالي</span>
            </button>

          </nav>

          {/* Logout */}
          <div className="border-t border-slate-100 p-4">

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl bg-red-50 px-4 py-3 font-medium text-red-600 transition hover:bg-red-100"
            >
              <span className="text-lg">🚪</span>
              <span>تسجيل الخروج</span>
            </button>

          </div>

        </aside>

        {/* ================================================== */}
        {/* MAIN CONTENT */}
        {/* ================================================== */}

        <div className="min-w-0 flex-1">

          {/* Mobile Header */}
          <div className="border-b border-slate-200 bg-white p-4 lg:hidden">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-xl text-white">
                  🎓
                </div>

                <div>
                  <h1 className="font-bold text-slate-800">
                    نظام إدارة الطلاب
                  </h1>

                  <p className="text-xs text-slate-400">
                    لوحة التحكم
                  </p>
                </div>

              </div>

              <button
                onClick={handleLogout}
                className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600"
              >
                خروج
              </button>

            </div>

            {/* Mobile Navigation */}
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">

              <button
                onClick={() =>
                  router.push("/dashboard/students")
                }
                className="rounded-xl bg-blue-50 p-3 text-center text-xs font-medium text-blue-700"
              >
                👨‍🎓
                <div className="mt-1">
                  الطلاب
                </div>
              </button>

              <button
                onClick={() =>
                  router.push("/dashboard/groups")
                }
                className="rounded-xl bg-purple-50 p-3 text-center text-xs font-medium text-purple-700"
              >
                👥
                <div className="mt-1">
                  المجموعات
                </div>
              </button>

              <button
                onClick={() =>
                  router.push("/dashboard/attendance")
                }
                className="rounded-xl bg-green-50 p-3 text-center text-xs font-medium text-green-700"
              >
                ✅
                <div className="mt-1">
                  الحضور
                </div>
              </button>

              <button
                onClick={() =>
                  router.push(
                    "/dashboard/attendance-report"
                  )
                }
                className="rounded-xl bg-orange-50 p-3 text-center text-xs font-medium text-orange-700"
              >
                📊
                <div className="mt-1">
                  تقرير الحضور
                </div>
              </button>

              <button
                onClick={() =>
                  router.push(
                    "/dashboard/subscriptions"
                  )
                }
                className="rounded-xl bg-amber-50 p-3 text-center text-xs font-medium text-amber-700"
              >
                💰
                <div className="mt-1">
                  الاشتراكات
                </div>
              </button>

              <button
                onClick={() =>
                  router.push(
                    "/dashboard/financial-report"
                  )
                }
                className="rounded-xl bg-indigo-50 p-3 text-center text-xs font-medium text-indigo-700"
              >
                📈
                <div className="mt-1">
                  التقرير المالي
                </div>
              </button>

            </div>

          </div>

          <div className="p-4 sm:p-6">

            <div className="mx-auto max-w-7xl">

              {/* ================= HEADER ================= */}

              <div className="mb-6 hidden rounded-2xl bg-white p-5 shadow-sm lg:flex lg:items-center lg:justify-between">

                <div>
                  <h1 className="text-2xl font-bold text-slate-800">
                    لوحة التحكم
                  </h1>

                  <p className="mt-1 text-sm text-slate-500">
                    نظرة سريعة على حالة الطلاب والحضور والاشتراكات
                  </p>
                </div>

                <div className="text-sm text-slate-500">
                  {getCurrentMonthName()}
                </div>

              </div>

              {/* ================= MAIN STATS ================= */}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                {/* الطلاب */}

                <div className="rounded-2xl bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-sm text-slate-500">
                        الطلاب النشطين
                      </p>

                      <p className="mt-2 text-3xl font-bold text-slate-800">
                        {loading
                          ? "..."
                          : stats.students}
                      </p>

                    </div>

                    <div className="rounded-xl bg-blue-50 p-3 text-2xl">
                      👨‍🎓
                    </div>

                  </div>

                  <button
                    onClick={() =>
                      router.push(
                        "/dashboard/students"
                      )
                    }
                    className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    عرض الطلاب ←
                  </button>

                </div>

                {/* المجموعات */}

                <div className="rounded-2xl bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-sm text-slate-500">
                        المجموعات
                      </p>

                      <p className="mt-2 text-3xl font-bold text-slate-800">
                        {loading
                          ? "..."
                          : stats.groups}
                      </p>

                    </div>

                    <div className="rounded-xl bg-purple-50 p-3 text-2xl">
                      👥
                    </div>

                  </div>

                  <button
                    onClick={() =>
                      router.push(
                        "/dashboard/groups"
                      )
                    }
                    className="mt-4 text-sm font-medium text-purple-600 hover:text-purple-700"
                  >
                    إدارة المجموعات ←
                  </button>

                </div>

                {/* حضور اليوم */}

                <div className="rounded-2xl bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-sm text-slate-500">
                        حضور اليوم
                      </p>

                      <p className="mt-2 text-3xl font-bold text-green-600">
                        {loading
                          ? "..."
                          : stats.todayPresent}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        من أصل {stats.todayTotal} تسجيل
                      </p>

                    </div>

                    <div className="rounded-xl bg-green-50 p-3 text-2xl">
                      ✅
                    </div>

                  </div>

                  <button
                    onClick={() =>
                      router.push(
                        "/dashboard/attendance"
                      )
                    }
                    className="mt-4 text-sm font-medium text-green-600 hover:text-green-700"
                  >
                    تسجيل الحضور ←
                  </button>

                </div>

                {/* المتأخرات */}

                <div className="rounded-2xl bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-sm text-slate-500">
                        المتأخرات
                      </p>

                      <p className="mt-2 text-3xl font-bold text-red-600">
                        {loading
                          ? "..."
                          : formatMoney(
                              stats.remaining
                            ) + " جنيه"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {getCurrentMonthName()}
                      </p>

                    </div>

                    <div className="rounded-xl bg-red-50 p-3 text-2xl">
                      💰
                    </div>

                  </div>

                  <button
                    onClick={() =>
                      router.push(
                        "/dashboard/financial-report"
                      )
                    }
                    className="mt-4 text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    عرض المتأخرات ←
                  </button>

                </div>

              </div>

              {/* ================= ATTENDANCE + FINANCIAL ================= */}

              <div className="mt-6 grid gap-6 xl:grid-cols-2">

                {/* الحضور */}

                <div className="rounded-2xl bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between">

                    <div>

                      <h2 className="text-lg font-bold text-slate-800">
                        حضور اليوم
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        ملخص تسجيل الحضور والغياب
                      </p>

                    </div>

                    <div className="rounded-xl bg-blue-50 p-3 text-xl">
                      📋
                    </div>

                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">

                    <div className="rounded-xl bg-green-50 p-4 text-center">

                      <p className="text-sm text-green-700">
                        حاضر
                      </p>

                      <p className="mt-2 text-2xl font-bold text-green-600">
                        {loading
                          ? "..."
                          : stats.todayPresent}
                      </p>

                    </div>

                    <div className="rounded-xl bg-red-50 p-4 text-center">

                      <p className="text-sm text-red-700">
                        غائب
                      </p>

                      <p className="mt-2 text-2xl font-bold text-red-600">
                        {loading
                          ? "..."
                          : stats.todayAbsent}
                      </p>

                    </div>

                    <div className="rounded-xl bg-slate-50 p-4 text-center">

                      <p className="text-sm text-slate-600">
                        الإجمالي
                      </p>

                      <p className="mt-2 text-2xl font-bold text-slate-700">
                        {loading
                          ? "..."
                          : stats.todayTotal}
                      </p>

                    </div>

                  </div>

                  <div className="mt-5">

                    <div className="mb-2 flex items-center justify-between">

                      <span className="text-sm text-slate-500">
                        نسبة الحضور
                      </span>

                      <span className="font-bold text-slate-700">
                        {loading
                          ? "..."
                          : stats.attendancePercentage +
                            "%"}
                      </span>

                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">

                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{
                          width:
                            stats.attendancePercentage +
                            "%",
                        }}
                      ></div>

                    </div>

                  </div>

                  <button
                    onClick={() =>
                      router.push(
                        "/dashboard/attendance-report"
                      )
                    }
                    className="mt-5 w-full rounded-xl bg-slate-800 px-4 py-3 font-medium text-white transition hover:bg-slate-700"
                  >
                    عرض تقرير الحضور
                  </button>

                </div>

                {/* الاشتراكات */}

                <div className="rounded-2xl bg-white p-6 shadow-sm">

                  <div className="flex items-center justify-between">

                    <div>

                      <h2 className="text-lg font-bold text-slate-800">
                        اشتراكات الشهر
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {getCurrentMonthName()}
                      </p>

                    </div>

                    <div className="rounded-xl bg-amber-50 p-3 text-xl">
                      💳
                    </div>

                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">

                    <div className="rounded-xl bg-blue-50 p-4 text-center">

                      <p className="text-xs text-blue-700">
                        المستحق
                      </p>

                      <p className="mt-2 text-xl font-bold text-blue-700">
                        {loading
                          ? "..."
                          : formatMoney(
                              stats.due
                            )}
                      </p>

                      <p className="text-xs text-slate-400">
                        جنيه
                      </p>

                    </div>

                    <div className="rounded-xl bg-green-50 p-4 text-center">

                      <p className="text-xs text-green-700">
                        المدفوع
                      </p>

                      <p className="mt-2 text-xl font-bold text-green-700">
                        {loading
                          ? "..."
                          : formatMoney(
                              stats.paid
                            )}
                      </p>

                      <p className="text-xs text-slate-400">
                        جنيه
                      </p>

                    </div>

                    <div className="rounded-xl bg-red-50 p-4 text-center">

                      <p className="text-xs text-red-700">
                        المتبقي
                      </p>

                      <p className="mt-2 text-xl font-bold text-red-700">
                        {loading
                          ? "..."
                          : formatMoney(
                              stats.remaining
                            )}
                      </p>

                      <p className="text-xs text-slate-400">
                        جنيه
                      </p>

                    </div>

                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">

                    <div>

                      <span className="font-bold text-green-600">
                        {stats.subscriptionsPaid}
                      </span>

                      <p className="text-xs text-slate-500">
                        مكتمل
                      </p>

                    </div>

                    <div>

                      <span className="font-bold text-amber-600">
                        {stats.subscriptionsPartial}
                      </span>

                      <p className="text-xs text-slate-500">
                        جزئي
                      </p>

                    </div>

                    <div>

                      <span className="font-bold text-red-600">
                        {stats.subscriptionsUnpaid}
                      </span>

                      <p className="text-xs text-slate-500">
                        غير مدفوع
                      </p>

                    </div>

                  </div>

                  <button
                    onClick={() =>
                      router.push(
                        "/dashboard/financial-report"
                      )
                    }
                    className="mt-5 w-full rounded-xl bg-slate-800 px-4 py-3 font-medium text-white transition hover:bg-slate-700"
                  >
                    عرض التقرير المالي
                  </button>

                </div>

              </div>

              {/* ================= QUICK ACTIONS ================= */}

              <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

                <h2 className="text-lg font-bold text-slate-800">
                  الوصول السريع
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  الوصول المباشر لأهم أقسام النظام
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

                  <button
                    onClick={() =>
                      router.push(
                        "/dashboard/students"
                      )
                    }
                    className="rounded-xl border border-slate-200 p-4 text-right transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <div className="text-2xl">
                      👨‍🎓
                    </div>

                    <p className="mt-2 font-bold text-slate-800">
                      الطلاب
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      إضافة وإدارة الطلاب
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      router.push(
                        "/dashboard/groups"
                      )
                    }
                    className="rounded-xl border border-slate-200 p-4 text-right transition hover:border-purple-300 hover:bg-purple-50"
                  >
                    <div className="text-2xl">
                      👥
                    </div>

                    <p className="mt-2 font-bold text-slate-800">
                      المجموعات
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      إدارة مجموعات التدريب
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      router.push(
                        "/dashboard/attendance"
                      )
                    }
                    className="rounded-xl border border-slate-200 p-4 text-right transition hover:border-green-300 hover:bg-green-50"
                  >
                    <div className="text-2xl">
                      ✅
                    </div>

                    <p className="mt-2 font-bold text-slate-800">
                      تسجيل الحضور
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      تسجيل حضور وغياب الطلاب
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      router.push(
                        "/dashboard/attendance-report"
                      )
                    }
                    className="rounded-xl border border-slate-200 p-4 text-right transition hover:border-orange-300 hover:bg-orange-50"
                  >
                    <div className="text-2xl">
                      📊
                    </div>

                    <p className="mt-2 font-bold text-slate-800">
                      تقرير الحضور
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      التقارير الشهرية
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      router.push(
                        "/dashboard/subscriptions"
                      )
                    }
                    className="rounded-xl border border-slate-200 p-4 text-right transition hover:border-amber-300 hover:bg-amber-50"
                  >
                    <div className="text-2xl">
                      💰
                    </div>

                    <p className="mt-2 font-bold text-slate-800">
                      الاشتراكات
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      المدفوعات والاشتراكات
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      router.push(
                        "/dashboard/financial-report"
                      )
                    }
                    className="rounded-xl border border-slate-200 p-4 text-right transition hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    <div className="text-2xl">
                      📈
                    </div>

                    <p className="mt-2 font-bold text-slate-800">
                      التقرير المالي
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      المتحصلات والمتأخرات
                    </p>
                  </button>

                </div>

              </div>

              {/* ================= WELCOME ================= */}

              <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

                <div className="flex items-start gap-4">

                  <div className="rounded-2xl bg-blue-50 p-4 text-2xl">
                    🎓
                  </div>

                  <div>

                    <h2 className="text-lg font-bold text-slate-800">
                      مرحبًا بك في نظام إدارة الطلاب
                    </h2>

                    <p className="mt-2 leading-7 text-slate-500">
                      من هنا يمكنك إدارة المجموعات والطلاب
                      والحضور والاشتراكات والتقارير المالية
                      وتقارير الحضور من مكان واحد.
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </main>
  );
}