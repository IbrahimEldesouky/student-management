"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function FinancialReportPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");

  const [stats, setStats] = useState({
    due: 0,
    paid: 0,
    remaining: 0,
    collectionPercentage: 0,
    totalStudents: 0,
    paidStudents: 0,
    partialStudents: 0,
    unpaidStudents: 0,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          router.replace("/");
          return;
        }

        const now = new Date();

        const year = now.getFullYear();
        const month = String(
          now.getMonth() + 1
        ).padStart(2, "0");

        setSelectedMonth(
          year + "-" + month
        );

        await loadData();
      }
    );

    return () => unsubscribe();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);

      const groupsSnapshot = await getDocs(
        collection(db, "groups")
      );

      const groupsData = [];

      groupsSnapshot.forEach((doc) => {
        groupsData.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setGroups(groupsData);

      const studentsSnapshot = await getDocs(
        collection(db, "students")
      );

      const studentsData = [];

      studentsSnapshot.forEach((doc) => {
        studentsData.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setStudents(studentsData);

      const subscriptionsSnapshot =
        await getDocs(
          collection(db, "subscriptions")
        );

      const subscriptionsData = [];

      subscriptionsSnapshot.forEach((doc) => {
        subscriptionsData.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setSubscriptions(
        subscriptionsData
      );
    } catch (error) {
      console.error(
        "Financial report error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) => {
    return Number(
      amount || 0
    ).toLocaleString("ar-EG");
  };

  // تحويل الأرقام العربية والفارسية إلى أرقام إنجليزية
  const convertArabicDigits = (
    value
  ) => {
    if (!value) {
      return "";
    }

    return String(value)
      .replace(
        /[٠-٩]/g,
        (digit) => {
          return String(
            "٠١٢٣٤٥٦٧٨٩".indexOf(
              digit
            )
          );
        }
      )
      .replace(
        /[۰-۹]/g,
        (digit) => {
          return String(
            "۰۱۲۳۴۵۶۷۸۹".indexOf(
              digit
            )
          );
        }
      );
  };

  // تحويل رقم الهاتف المصري إلى صيغة WhatsApp
  //
  // أرقام أولياء الأمور في النظام مخزنة
  // 10 أرقام بدون الصفر الأول.
  //
  // مثال:
  // 1038420020
  //
  // يتحول إلى:
  // 201038420020
  const normalizeEgyptianPhone = (
    phone
  ) => {
    if (!phone) {
      return "";
    }

    let value =
      convertArabicDigits(
        phone
      ).replace(
        /\D/g,
        ""
      );

    if (!value) {
      return "";
    }

    // إذا كان الرقم مكتوبًا بكود مصر 0020
    if (
      value.startsWith("0020")
    ) {
      value =
        value.substring(2);
    }

    // إذا كان الرقم بالفعل بصيغة كود مصر
    if (
      value.startsWith("20")
    ) {
      return value;
    }

    // رقم مخزن 10 أرقام بدون الصفر الأول
    // مثال:
    // 1038420020
    //
    // يصبح:
    // 201038420020
    if (
      value.length === 10
    ) {
      return "20" + value;
    }

    // رقم مصري عادي 11 رقم
    // مثال:
    // 01038420020
    //
    // يصبح:
    // 201038420020
    if (
      value.length === 11 &&
      value.startsWith("0")
    ) {
      return (
        "20" +
        value.substring(1)
      );
    }

    return value;
  };

  // التحقق من أن الرقم رقم موبايل مصري صالح
  const isValidEgyptianPhone = (
    phone
  ) => {
    if (!phone) {
      return false;
    }

    return /^20(10|11|12|15)\d{8}$/.test(
      phone
    );
  };

  const getMonthName = () => {
    if (!selectedMonth) {
      return "";
    }

    const parts =
      selectedMonth.split("-");

    if (parts.length !== 2) {
      return selectedMonth;
    }

    const date = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      1
    );

    return date.toLocaleDateString(
      "ar-EG",
      {
        month: "long",
        year: "numeric",
      }
    );
  };

  const getStudentName = (
    studentId
  ) => {
    const student = students.find(
      (item) =>
        item.id === studentId
    );

    if (student) {
      return (
        student.name ||
        "بدون اسم"
      );
    }

    return "طالب غير موجود";
  };

  const getStudentPhone = (
    studentId
  ) => {
    const student = students.find(
      (item) =>
        item.id === studentId
    );

    if (student) {
      return (
        student.guardianPhone ||
        ""
      );
    }

    return "";
  };

  const getGroupName = (
    groupId
  ) => {
    const group = groups.find(
      (item) =>
        item.id === groupId
    );

    if (group) {
      return (
        group.name ||
        "بدون مجموعة"
      );
    }

    return "بدون مجموعة";
  };

  const getFilteredSubscriptions =
    () => {
      return subscriptions.filter(
        (subscription) => {
          if (
            subscription.month !==
            selectedMonth
          ) {
            return false;
          }

          if (
            selectedGroup !==
              "all" &&
            subscription.groupId !==
              selectedGroup
          ) {
            return false;
          }

          return true;
        }
      );
    };

  const getReportRows = () => {
    const filteredSubscriptions =
      getFilteredSubscriptions();

    return filteredSubscriptions.map(
      (subscription) => {
        const due = Number(
          subscription.dueAmount ||
            0
        );

        const paid = Number(
          subscription.totalPaid ||
            subscription.paidAmount ||
            0
        );

        let remaining = Number(
          subscription.remainingAmount
        );

        if (isNaN(remaining)) {
          remaining =
            due - paid;
        }

        if (remaining < 0) {
          remaining = 0;
        }

        let status =
          "غير مدفوع";

        if (remaining <= 0) {
          status =
            "مسدد بالكامل";
        } else if (paid > 0) {
          status =
            "دفع جزئي";
        }

        return {
          ...subscription,
          studentName:
            getStudentName(
              subscription.studentId
            ),
          guardianPhone:
            getStudentPhone(
              subscription.studentId
            ),
          groupName:
            getGroupName(
              subscription.groupId
            ),
          due: due,
          paid: paid,
          remaining: remaining,
          status: status,
        };
      }
    );
  };

  useEffect(() => {
    if (!selectedMonth) {
      return;
    }

    const rows =
      getReportRows();

    let due = 0;
    let paid = 0;
    let remaining = 0;

    let paidStudents = 0;
    let partialStudents = 0;
    let unpaidStudents = 0;

    rows.forEach((row) => {
      due += row.due;
      paid += row.paid;
      remaining +=
        row.remaining;

      if (
        row.status ===
        "مسدد بالكامل"
      ) {
        paidStudents++;
      } else if (
        row.status ===
        "دفع جزئي"
      ) {
        partialStudents++;
      } else {
        unpaidStudents++;
      }
    });

    let collectionPercentage = 0;

    if (due > 0) {
      collectionPercentage =
        Math.round(
          (paid / due) * 100
        );
    }

    setStats({
      due: due,
      paid: paid,
      remaining: remaining,
      collectionPercentage:
        collectionPercentage,
      totalStudents:
        rows.length,
      paidStudents:
        paidStudents,
      partialStudents:
        partialStudents,
      unpaidStudents:
        unpaidStudents,
    });
  }, [
    selectedMonth,
    selectedGroup,
    subscriptions,
    students,
    groups,
  ]);

  // إرسال تذكير الدفع عبر WhatsApp
  const openPaymentWhatsApp = (
    row
  ) => {
    if (!row.guardianPhone) {
      alert(
        "لا يوجد رقم هاتف لولي الأمر لهذا الطالب."
      );
      return;
    }

    const originalPhone =
      row.guardianPhone;

    const phone =
      normalizeEgyptianPhone(
        originalPhone
      );

    if (!phone) {
      alert(
        "لا يوجد رقم هاتف صالح لولي الأمر لهذا الطالب."
      );
      return;
    }

    if (
      !isValidEgyptianPhone(
        phone
      )
    ) {
      alert(
        "رقم ولي أمر الطالب " +
          row.studentName +
          " غير صالح لواتساب.\n\n" +
          "الرقم المسجل: " +
          originalPhone +
          "\n\n" +
          "النظام يتوقع رقم موبايل مصري صحيح.\n" +
          "مثال عند التخزين بدون الصفر الأول:\n" +
          "1038420020"
      );
      return;
    }

    const monthName =
      getMonthName();

    let message =
      "السلام عليكم ورحمة الله وبركاته\n\n";

    message +=
      "نذكركم بخصوص اشتراك الطالب/ة: " +
      row.studentName +
      "\n";

    message +=
      "المجموعة: " +
      row.groupName +
      "\n";

    message +=
      "عن شهر: " +
      monthName +
      "\n\n";

    message +=
      "المبلغ المستحق: " +
      formatMoney(row.due) +
      " جنيه\n";

    message +=
      "المبلغ المدفوع: " +
      formatMoney(row.paid) +
      " جنيه\n";

    message +=
      "المبلغ المتبقي: " +
      formatMoney(row.remaining) +
      " جنيه\n\n";

    if (row.remaining > 0) {
      message +=
        "برجاء التكرم بسداد المبلغ المتبقي في أقرب وقت.\n\n";
    } else {
      message +=
        "نشكر لكم الالتزام بسداد الاشتراك بالكامل.\n\n";
    }

    message +=
      "مع خالص الشكر والتقدير.";

    const url =
      "https://wa.me/" +
      phone +
      "?text=" +
      encodeURIComponent(
        message
      );

    window.open(
      url,
      "_blank"
    );
  };

  const getStatusClass = (
    status
  ) => {
    if (
      status ===
      "مسدد بالكامل"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      status ===
      "دفع جزئي"
    ) {
      return "bg-amber-100 text-amber-700";
    }

    return "bg-red-100 text-red-700";
  };

  const rows =
    getReportRows();

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100 p-4 sm:p-6"
    >
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                التقرير المالي
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                متابعة الاشتراكات والمدفوعات والمتأخرات
              </p>
            </div>

            <button
              onClick={() =>
                router.push(
                  "/dashboard"
                )
              }
              className="rounded-xl bg-slate-100 px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-200"
            >
              ← العودة للوحة التحكم
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-800">
            الفلاتر
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                الشهر
              </label>

              <input
                type="month"
                value={
                  selectedMonth
                }
                onChange={(e) =>
                  setSelectedMonth(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                المجموعة
              </label>

              <select
                value={
                  selectedGroup
                }
                onChange={(e) =>
                  setSelectedGroup(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="all">
                  كل المجموعات
                </option>

                {groups.map(
                  (group) => (
                    <option
                      key={
                        group.id
                      }
                      value={
                        group.id
                      }
                    >
                      {
                        group.name
                      }
                    </option>
                  )
                )}
              </select>
            </div>

          </div>
        </div>

        {/* Main Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              إجمالي المستحق
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {loading
                ? "..."
                : formatMoney(
                    stats.due
                  )}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              جنيه
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              إجمالي المدفوع
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {loading
                ? "..."
                : formatMoney(
                    stats.paid
                  )}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              جنيه
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              إجمالي المتبقي
            </p>

            <p className="mt-2 text-3xl font-bold text-red-600">
              {loading
                ? "..."
                : formatMoney(
                    stats.remaining
                  )}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              جنيه
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              نسبة التحصيل
            </p>

            <p className="mt-2 text-3xl font-bold text-purple-600">
              {loading
                ? "..."
                : stats.collectionPercentage +
                  "%"}
            </p>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-purple-500"
                style={{
                  width:
                    stats.collectionPercentage +
                    "%",
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Student Status */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-800">
            حالة السداد
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">

            <div className="rounded-xl bg-green-50 p-5">
              <p className="text-sm text-green-700">
                مسدد بالكامل
              </p>

              <p className="mt-2 text-3xl font-bold text-green-600">
                {
                  stats.paidStudents
                }
              </p>

              <p className="mt-1 text-xs text-green-600">
                طالب
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-5">
              <p className="text-sm text-amber-700">
                دفع جزئي
              </p>

              <p className="mt-2 text-3xl font-bold text-amber-600">
                {
                  stats.partialStudents
                }
              </p>

              <p className="mt-1 text-xs text-amber-600">
                طالب
              </p>
            </div>

            <div className="rounded-xl bg-red-50 p-5">
              <p className="text-sm text-red-700">
                غير مدفوع
              </p>

              <p className="mt-2 text-3xl font-bold text-red-600">
                {
                  stats.unpaidStudents
                }
              </p>

              <p className="mt-1 text-xs text-red-600">
                طالب
              </p>
            </div>

          </div>
        </div>

        {/* Report Table */}
        <div className="mt-6 rounded-2xl bg-white shadow-sm">

          <div className="border-b border-slate-100 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  تفاصيل الاشتراكات
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {getMonthName()} -{" "}
                  {selectedGroup ===
                  "all"
                    ? "كل المجموعات"
                    : getGroupName(
                        selectedGroup
                      )}
                </p>
              </div>

              <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
                عدد الطلاب:{" "}
                {rows.length}
              </div>

            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">
              جاري تحميل التقرير...
            </div>
          ) : rows.length ===
            0 ? (
            <div className="p-10 text-center">

              <div className="text-4xl">
                💰
              </div>

              <p className="mt-3 font-bold text-slate-700">
                لا توجد اشتراكات لهذا الشهر
              </p>

              <p className="mt-1 text-sm text-slate-500">
                قم بإضافة الاشتراكات من صفحة الاشتراكات.
              </p>

              <button
                onClick={() =>
                  router.push(
                    "/dashboard/subscriptions"
                  )
                }
                className="mt-5 rounded-xl bg-slate-800 px-5 py-3 font-medium text-white hover:bg-slate-700"
              >
                إدارة الاشتراكات
              </button>

            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[900px] text-right">

                <thead className="bg-slate-50">
                  <tr>

                    <th className="px-4 py-4 text-sm font-bold text-slate-600">
                      الطالب
                    </th>

                    <th className="px-4 py-4 text-sm font-bold text-slate-600">
                      المجموعة
                    </th>

                    <th className="px-4 py-4 text-sm font-bold text-slate-600">
                      المستحق
                    </th>

                    <th className="px-4 py-4 text-sm font-bold text-slate-600">
                      المدفوع
                    </th>

                    <th className="px-4 py-4 text-sm font-bold text-slate-600">
                      المتبقي
                    </th>

                    <th className="px-4 py-4 text-sm font-bold text-slate-600">
                      الحالة
                    </th>

                    <th className="px-4 py-4 text-sm font-bold text-slate-600">
                      إجراء
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {rows.map(
                    (row) => (
                      <tr
                        key={row.id}
                        className="border-t border-slate-100 hover:bg-slate-50"
                      >

                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-800">
                            {
                              row.studentName
                            }
                          </p>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {
                            row.groupName
                          }
                        </td>

                        <td className="px-4 py-4 font-medium text-blue-600">
                          {
                            formatMoney(
                              row.due
                            )
                          }{" "}
                          جنيه
                        </td>

                        <td className="px-4 py-4 font-medium text-green-600">
                          {
                            formatMoney(
                              row.paid
                            )
                          }{" "}
                          جنيه
                        </td>

                        <td className="px-4 py-4 font-bold text-red-600">
                          {
                            formatMoney(
                              row.remaining
                            )
                          }{" "}
                          جنيه
                        </td>

                        <td className="px-4 py-4">

                          <span
                            className={
                              "inline-flex rounded-full px-3 py-1 text-xs font-bold " +
                              getStatusClass(
                                row.status
                              )
                            }
                          >
                            {
                              row.status
                            }
                          </span>

                        </td>

                        <td className="px-4 py-4">

                          {row.remaining >
                          0 ? (
                            <button
                              onClick={() =>
                                openPaymentWhatsApp(
                                  row
                                )
                              }
                              className="rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-100"
                            >
                              📱 تذكير واتساب
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">
                              مكتمل
                            </span>
                          )}

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

                <tfoot className="bg-slate-50">

                  <tr>

                    <td
                      colSpan="2"
                      className="px-4 py-4 font-bold text-slate-800"
                    >
                      الإجمالي
                    </td>

                    <td className="px-4 py-4 font-bold text-blue-700">
                      {
                        formatMoney(
                          stats.due
                        )
                      }{" "}
                      جنيه
                    </td>

                    <td className="px-4 py-4 font-bold text-green-700">
                      {
                        formatMoney(
                          stats.paid
                        )
                      }{" "}
                      جنيه
                    </td>

                    <td className="px-4 py-4 font-bold text-red-700">
                      {
                        formatMoney(
                          stats.remaining
                        )
                      }{" "}
                      جنيه
                    </td>

                    <td colSpan="2"></td>

                  </tr>

                </tfoot>

              </table>

            </div>
          )}
        </div>

        {/* Bottom */}
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-800">
            ملخص التقرير
          </h2>

          <div className="mt-4 grid gap-3 text-sm text-slate-600">

            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <span>
                إجمالي الاشتراكات
              </span>

              <span className="font-bold text-slate-800">
                {
                  stats.totalStudents
                }
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-green-50 p-4">
              <span className="text-green-700">
                نسبة المبلغ المحصل
              </span>

              <span className="font-bold text-green-700">
                {
                  stats.collectionPercentage
                }
                %
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-red-50 p-4">
              <span className="text-red-700">
                إجمالي المبالغ المطلوب تحصيلها
              </span>

              <span className="font-bold text-red-700">
                {
                  formatMoney(
                    stats.remaining
                  )
                }{" "}
                جنيه
              </span>
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}