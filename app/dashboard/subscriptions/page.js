"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useRouter } from "next/navigation";

export default function SubscriptionsPage() {
  const router = useRouter();

  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  const [selectedGroupId, setSelectedGroupId] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  const [dueAmount, setDueAmount] = useState("");

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("كاش");
  const [paymentNotes, setPaymentNotes] = useState("");

  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(function () {
    loadInitialData();
  }, []);

  useEffect(
    function () {
      if (groups.length > 0 && selectedMonth) {
        loadSubscriptions();
      }
    },
    [selectedGroupId, selectedMonth, groups]
  );

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      var groupsSnapshot = await getDocs(collection(db, "groups"));

      var groupsData = groupsSnapshot.docs.map(function (item) {
        return {
          id: item.id,
          ...item.data(),
        };
      });

      groupsData.sort(function (a, b) {
        return String(a.name || "").localeCompare(
          String(b.name || ""),
          "ar"
        );
      });

      setGroups(groupsData);

      var studentsSnapshot = await getDocs(collection(db, "students"));

      var studentsData = studentsSnapshot.docs.map(function (item) {
        return {
          id: item.id,
          ...item.data(),
        };
      });

      studentsData.sort(function (a, b) {
        return String(a.name || "").localeCompare(
          String(b.name || ""),
          "ar"
        );
      });

      setStudents(studentsData);

      var now = new Date();
      var year = now.getFullYear();
      var month = String(now.getMonth() + 1).padStart(2, "0");

      setSelectedMonth(year + "-" + month);
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء تحميل البيانات.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSubscriptions() {
    try {
      setError("");

      var subscriptionsQuery = query(
        collection(db, "subscriptions"),
        where("month", "==", selectedMonth)
      );

      var snapshot = await getDocs(subscriptionsQuery);

      var data = snapshot.docs.map(function (item) {
        return {
          id: item.id,
          ...item.data(),
        };
      });

      if (selectedGroupId !== "all") {
        data = data.filter(function (item) {
          return item.groupId === selectedGroupId;
        });
      }

      setSubscriptions(data);
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء تحميل الاشتراكات.");
    }
  }

  function getGroupName(groupId) {
    var group = groups.find(function (item) {
      return item.id === groupId;
    });

    return group ? group.name : "بدون مجموعة";
  }

  function getMonthName(monthValue) {
    if (!monthValue) {
      return "";
    }

    var parts = monthValue.split("-");

    if (parts.length !== 2) {
      return monthValue;
    }

    var year = parts[0];
    var month = Number(parts[1]);

    var names = [
      "",
      "يناير",
      "فبراير",
      "مارس",
      "أبريل",
      "مايو",
      "يونيو",
      "يوليو",
      "أغسطس",
      "سبتمبر",
      "أكتوبر",
      "نوفمبر",
      "ديسمبر",
    ];

    return names[month] + " " + year;
  }

  function getStudentSubscription(studentId) {
    return subscriptions.find(function (item) {
      return item.studentId === studentId;
    });
  }

  function normalizeEgyptianPhone(phone) {
    if (!phone) {
      return "";
    }

    var value = String(phone).replace(/\D/g, "");

    if (value.indexOf("0020") === 0) {
      value = value.substring(2);
    }

    if (value.indexOf("20") === 0) {
      return value;
    }

    if (value.indexOf("0") === 0) {
      return "20" + value.substring(1);
    }

    return value;
  }

  function openPaymentWhatsApp(subscription, student) {
    if (!student) {
      setError("تعذر العثور على بيانات الطالب.");
      return;
    }

    var phone = normalizeEgyptianPhone(student.guardianPhone);

    if (!phone) {
      setError(
        "لا يوجد رقم هاتف ولي أمر مسجل للطالب: " +
          (student.name || "هذا الطالب")
      );
      return;
    }

    var due = Number(subscription.dueAmount || 0);
    var paid = Number(subscription.totalPaid || 0);
    var remaining = Number(subscription.remainingAmount || 0);

    var studentName = student.name || subscription.studentName || "الطالب";
    var groupName = getGroupName(
      student.groupId || subscription.groupId || ""
    );
    var monthName = getMonthName(subscription.month || selectedMonth);

    var messageText = "";

    messageText += "السلام عليكم ورحمة الله وبركاته\n\n";
    messageText += "ولي أمر الطالب / " + studentName + "\n";
    messageText += "نحيط حضرتكم علمًا ببيانات اشتراك الطالب عن شهر " + monthName + ":\n\n";
    messageText += "👤 الطالب: " + studentName + "\n";
    messageText += "👥 المجموعة: " + groupName + "\n";
    messageText += "💰 المبلغ المستحق: " + due + " جنيه\n";
    messageText += "✅ المبلغ المدفوع: " + paid + " جنيه\n";
    messageText += "💳 المبلغ المتبقي: " + remaining + " جنيه\n\n";

    if (remaining > 0) {
      messageText +=
        "نرجو من حضرتكم التكرم بسداد المبلغ المتبقي في أقرب وقت، مع خالص الشكر والتقدير لتعاونكم.\n\n";
    } else {
      messageText +=
        "تم سداد الاشتراك بالكامل، ونشكركم على الالتزام والتعاون.\n\n";
    }

    messageText += "مع خالص التحية والتقدير\n";
    messageText += "د. ابراهيم الدسوقي";

    var whatsappUrl =
      "https://wa.me/" +
      phone +
      "?text=" +
      encodeURIComponent(messageText);

    window.open(whatsappUrl, "_blank");
  }

  function openSubscriptionForm(student) {
    setSelectedStudent(student);
    setDueAmount("");
    setMessage("");
    setError("");
    setShowSubscriptionForm(true);
  }

  function closeSubscriptionForm() {
    setShowSubscriptionForm(false);
    setSelectedStudent(null);
    setDueAmount("");
  }

  async function createSubscription() {
    if (!selectedStudent) {
      return;
    }

    var amount = Number(dueAmount);

    if (!dueAmount || amount <= 0) {
      setError("من فضلك أدخل المبلغ المستحق.");
      return;
    }

    var existing = getStudentSubscription(selectedStudent.id);

    if (existing) {
      setError("يوجد بالفعل اشتراك لهذا الطالب في هذا الشهر.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await addDoc(collection(db, "subscriptions"), {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name || "",
        groupId: selectedStudent.groupId || "",
        month: selectedMonth,
        dueAmount: amount,
        totalPaid: 0,
        remainingAmount: amount,
        status: "unpaid",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      closeSubscriptionForm();

      setMessage("تم إنشاء الاشتراك بنجاح.");

      await loadSubscriptions();
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء إنشاء الاشتراك.");
    } finally {
      setSaving(false);
    }
  }

  function openPaymentForm(subscription) {
    setSelectedSubscription(subscription);

    var today = new Date();
    var year = today.getFullYear();
    var month = String(today.getMonth() + 1).padStart(2, "0");
    var day = String(today.getDate()).padStart(2, "0");

    setPaymentDate(year + "-" + month + "-" + day);
    setPaymentAmount("");
    setPaymentMethod("كاش");
    setPaymentNotes("");

    setMessage("");
    setError("");

    setShowPaymentForm(true);
  }

  function closePaymentForm() {
    setShowPaymentForm(false);
    setSelectedSubscription(null);
    setPaymentAmount("");
    setPaymentDate("");
    setPaymentMethod("كاش");
    setPaymentNotes("");
  }

  async function addPayment() {
    if (!selectedSubscription) {
      return;
    }

    var amount = Number(paymentAmount);
    var remaining = Number(selectedSubscription.remainingAmount || 0);

    if (!paymentAmount || amount <= 0) {
      setError("من فضلك أدخل مبلغ الدفعة.");
      return;
    }

    if (!paymentDate) {
      setError("من فضلك اختر تاريخ الدفع.");
      return;
    }

    if (amount > remaining) {
      setError("مبلغ الدفعة أكبر من المبلغ المتبقي.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await addDoc(collection(db, "payments"), {
        subscriptionId: selectedSubscription.id,
        studentId: selectedSubscription.studentId,
        studentName: selectedSubscription.studentName,
        amount: amount,
        paymentDate: paymentDate,
        method: paymentMethod,
        notes: paymentNotes,
        createdAt: serverTimestamp(),
      });

      var newTotalPaid =
        Number(selectedSubscription.totalPaid || 0) + amount;

      var newRemaining =
        Number(selectedSubscription.dueAmount || 0) - newTotalPaid;

      var newStatus = "partial";

      if (newRemaining <= 0) {
        newRemaining = 0;
        newStatus = "paid";
      } else if (newTotalPaid <= 0) {
        newStatus = "unpaid";
      }

      await updateDoc(
        doc(db, "subscriptions", selectedSubscription.id),
        {
          totalPaid: newTotalPaid,
          remainingAmount: newRemaining,
          status: newStatus,
          updatedAt: serverTimestamp(),
        }
      );

      closePaymentForm();

      setMessage("تم تسجيل الدفعة بنجاح.");

      await loadSubscriptions();
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء تسجيل الدفعة.");
    } finally {
      setSaving(false);
    }
  }

  async function openPaymentHistory(subscription) {
    setSelectedSubscription(subscription);
    setPaymentHistory([]);
    setShowPaymentHistory(true);
    setLoadingHistory(true);
    setError("");
    setMessage("");

    try {
      var paymentsQuery = query(
        collection(db, "payments"),
        where("subscriptionId", "==", subscription.id)
      );

      var snapshot = await getDocs(paymentsQuery);

      var data = snapshot.docs.map(function (item) {
        return {
          id: item.id,
          ...item.data(),
        };
      });

      data.sort(function (a, b) {
        return String(b.paymentDate || "").localeCompare(
          String(a.paymentDate || "")
        );
      });

      setPaymentHistory(data);
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء تحميل سجل المدفوعات.");
    } finally {
      setLoadingHistory(false);
    }
  }

  function closePaymentHistory() {
    setShowPaymentHistory(false);
    setSelectedSubscription(null);
    setPaymentHistory([]);
  }

  function getStatusText(status) {
    if (status === "paid") {
      return "مدفوع بالكامل";
    }

    if (status === "partial") {
      return "مدفوع جزئيًا";
    }

    return "غير مدفوع";
  }

  function getStatusClass(status) {
    if (status === "paid") {
      return "bg-green-100 text-green-700";
    }

    if (status === "partial") {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-red-100 text-red-700";
  }

  var displayedStudents = students.filter(function (student) {
    if (student.status !== "active") {
      return false;
    }

    if (
      selectedGroupId !== "all" &&
      student.groupId !== selectedGroupId
    ) {
      return false;
    }

    return true;
  });

  var totalDue = subscriptions.reduce(function (sum, item) {
    return sum + Number(item.dueAmount || 0);
  }, 0);

  var totalPaid = subscriptions.reduce(function (sum, item) {
    return sum + Number(item.totalPaid || 0);
  }, 0);

  var totalRemaining = subscriptions.reduce(function (sum, item) {
    return sum + Number(item.remainingAmount || 0);
  }, 0);

  var paymentHistoryTotal = paymentHistory.reduce(function (sum, item) {
    return sum + Number(item.amount || 0);
  }, 0);

  if (loading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-slate-50 flex items-center justify-center"
      >
        <div className="text-xl font-bold text-slate-700">
          جاري تحميل البيانات...
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 p-4 md:p-8"
    >
      <div className="max-w-7xl mx-auto">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              الاشتراكات والمدفوعات
            </h1>

            <p className="text-slate-500 mt-2">
              إدارة الاشتراكات الشهرية وتسجيل ومراجعة المدفوعات
            </p>
          </div>

          <button
            onClick={function () {
              router.push("/dashboard");
            }}
            className="bg-slate-800 text-white px-5 py-3 rounded-xl hover:bg-slate-700"
          >
            العودة للوحة التحكم
          </button>
        </div>

        {message && (
          <div className="mb-5 bg-green-100 border border-green-300 text-green-800 rounded-xl p-4">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 bg-red-100 border border-red-300 text-red-800 rounded-xl p-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="block font-bold text-slate-700 mb-2">
                المجموعة
              </label>

              <select
                value={selectedGroupId}
                onChange={function (e) {
                  setSelectedGroupId(e.target.value);
                }}
                className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">كل المجموعات</option>

                {groups.map(function (group) {
                  return (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-2">
                الشهر
              </label>

              <input
                type="month"
                value={selectedMonth}
                onChange={function (e) {
                  setSelectedMonth(e.target.value);
                }}
                className="w-full border border-slate-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-slate-500 mb-2">الشهر</p>
            <p className="text-xl font-bold text-slate-800">
              {getMonthName(selectedMonth)}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-slate-500 mb-2">إجمالي المستحق</p>
            <p className="text-2xl font-bold text-blue-600">
              {totalDue} جنيه
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-slate-500 mb-2">إجمالي المدفوع</p>
            <p className="text-2xl font-bold text-green-600">
              {totalPaid} جنيه
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <p className="text-slate-500 mb-2">إجمالي المتبقي</p>
            <p className="text-2xl font-bold text-red-600">
              {totalRemaining} جنيه
            </p>
          </div>

        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

          <div className="p-5 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">
              طلاب {getMonthName(selectedMonth)}
            </h2>

            <p className="text-slate-500 mt-1">
              إنشاء الاشتراك وتسجيل الدفعات ومراجعة سجل السداد
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1350px]">

              <thead className="bg-slate-100">
                <tr>
                  <th className="p-4 text-right">الطالب</th>
                  <th className="p-4 text-right">المجموعة</th>
                  <th className="p-4 text-right">المستحق</th>
                  <th className="p-4 text-right">المدفوع</th>
                  <th className="p-4 text-right">المتبقي</th>
                  <th className="p-4 text-right">الحالة</th>
                  <th className="p-4 text-right">الإجراء</th>
                </tr>
              </thead>

              <tbody>

                {displayedStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="p-10 text-center text-slate-500"
                    >
                      لا يوجد طلاب في هذه المجموعة.
                    </td>
                  </tr>
                ) : (
                  displayedStudents.map(function (student) {
                    var subscription = getStudentSubscription(student.id);

                    return (
                      <tr
                        key={student.id}
                        className="border-t border-slate-100"
                      >
                        <td className="p-4 font-bold text-slate-800">
                          {student.name}
                        </td>

                        <td className="p-4 text-slate-600">
                          {getGroupName(student.groupId)}
                        </td>

                        <td className="p-4">
                          {subscription
                            ? subscription.dueAmount + " جنيه"
                            : "-"}
                        </td>

                        <td className="p-4 text-green-600 font-bold">
                          {subscription
                            ? subscription.totalPaid + " جنيه"
                            : "-"}
                        </td>

                        <td className="p-4 text-red-600 font-bold">
                          {subscription
                            ? subscription.remainingAmount + " جنيه"
                            : "-"}
                        </td>

                        <td className="p-4">
                          {subscription ? (
                            <span
                              className={
                                "px-3 py-2 rounded-full text-sm font-bold " +
                                getStatusClass(subscription.status)
                              }
                            >
                              {getStatusText(subscription.status)}
                            </span>
                          ) : (
                            <span className="px-3 py-2 rounded-full text-sm font-bold bg-slate-100 text-slate-600">
                              لم يتم إنشاء الاشتراك
                            </span>
                          )}
                        </td>

                        <td className="p-4">

                          {!subscription ? (
                            <button
                              onClick={function () {
                                openSubscriptionForm(student);
                              }}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                            >
                              إنشاء الاشتراك
                            </button>
                          ) : (
                            <div className="flex flex-wrap gap-2">

                              <button
                                onClick={function () {
                                  openPaymentForm(subscription);
                                }}
                                disabled={subscription.status === "paid"}
                                className={
                                  subscription.status === "paid"
                                    ? "bg-slate-200 text-slate-400 px-3 py-2 rounded-lg cursor-not-allowed"
                                    : "bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700"
                                }
                              >
                                {subscription.status === "paid"
                                  ? "تم السداد"
                                  : "تسجيل دفعة"}
                              </button>

                              <button
                                onClick={function () {
                                  openPaymentHistory(subscription);
                                }}
                                className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700"
                              >
                                سجل الدفعات
                              </button>

                              <button
                                type="button"
                                onClick={function () {
                                  openPaymentWhatsApp(
                                    subscription,
                                    student
                                  );
                                }}
                                className="bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-lg hover:bg-green-100"
                              >
                                📱 تذكير واتساب
                              </button>

                            </div>
                          )}

                        </td>
                      </tr>
                    );
                  })
                )}

              </tbody>

            </table>

          </div>

        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5 text-blue-900">
          <h3 className="font-bold mb-2">
            ملاحظة مهمة
          </h3>

          <p className="leading-7">
            المبلغ المستحق يتم إدخاله يدويًا لكل طالب، ويتم حفظه مع اشتراك
            الشهر نفسه حتى تظل البيانات التاريخية صحيحة حتى لو تغيرت قيمة
            الاشتراك في المستقبل.
          </p>
        </div>

      </div>

      {showSubscriptionForm && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">

          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              إنشاء اشتراك
            </h2>

            <p className="text-slate-500 mb-6">
              {selectedStudent.name} - {getMonthName(selectedMonth)}
            </p>

            <label className="block font-bold text-slate-700 mb-2">
              المبلغ المستحق
            </label>

            <input
              type="number"
              min="0"
              value={dueAmount}
              onChange={function (e) {
                setDueAmount(e.target.value);
              }}
              placeholder="مثال: 300"
              className="w-full border border-slate-300 rounded-xl p-3 mb-6"
            />

            <div className="flex gap-3">

              <button
                onClick={createSubscription}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "جاري الحفظ..." : "حفظ الاشتراك"}
              </button>

              <button
                onClick={closeSubscriptionForm}
                disabled={saving}
                className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-xl hover:bg-slate-300"
              >
                إلغاء
              </button>

            </div>

          </div>

        </div>
      )}

      {showPaymentForm && selectedSubscription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">

          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">

            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              تسجيل دفعة
            </h2>

            <p className="text-slate-500 mb-5">
              {selectedSubscription.studentName}
            </p>

            <div className="bg-slate-50 rounded-xl p-4 mb-5">
              <div className="flex justify-between mb-2">
                <span>المستحق</span>
                <strong>
                  {selectedSubscription.dueAmount} جنيه
                </strong>
              </div>

              <div className="flex justify-between mb-2">
                <span>المدفوع</span>
                <strong className="text-green-600">
                  {selectedSubscription.totalPaid} جنيه
                </strong>
              </div>

              <div className="flex justify-between">
                <span>المتبقي</span>
                <strong className="text-red-600">
                  {selectedSubscription.remainingAmount} جنيه
                </strong>
              </div>
            </div>

            <label className="block font-bold text-slate-700 mb-2">
              مبلغ الدفعة
            </label>

            <input
              type="number"
              min="0"
              value={paymentAmount}
              onChange={function (e) {
                setPaymentAmount(e.target.value);
              }}
              placeholder="مثال: 100"
              className="w-full border border-slate-300 rounded-xl p-3 mb-4"
            />

            <label className="block font-bold text-slate-700 mb-2">
              تاريخ الدفع
            </label>

            <input
              type="date"
              value={paymentDate}
              onChange={function (e) {
                setPaymentDate(e.target.value);
              }}
              className="w-full border border-slate-300 rounded-xl p-3 mb-4"
            />

            <label className="block font-bold text-slate-700 mb-2">
              طريقة الدفع
            </label>

            <select
              value={paymentMethod}
              onChange={function (e) {
                setPaymentMethod(e.target.value);
              }}
              className="w-full border border-slate-300 rounded-xl p-3 mb-4"
            >
              <option value="كاش">كاش</option>
              <option value="تحويل">تحويل</option>
              <option value="أخرى">أخرى</option>
            </select>

            <label className="block font-bold text-slate-700 mb-2">
              ملاحظات
            </label>

            <textarea
              value={paymentNotes}
              onChange={function (e) {
                setPaymentNotes(e.target.value);
              }}
              placeholder="ملاحظات اختيارية"
              rows="3"
              className="w-full border border-slate-300 rounded-xl p-3 mb-6"
            />

            <div className="flex gap-3">

              <button
                onClick={addPayment}
                disabled={saving}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "جاري الحفظ..." : "حفظ الدفعة"}
              </button>

              <button
                onClick={closePaymentForm}
                disabled={saving}
                className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-xl hover:bg-slate-300"
              >
                إلغاء
              </button>

            </div>

          </div>

        </div>
      )}

      {showPaymentHistory && selectedSubscription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">

          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between gap-4 mb-6">

              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  سجل المدفوعات
                </h2>

                <p className="text-slate-500 mt-1">
                  {selectedSubscription.studentName}
                  {" - "}
                  {getMonthName(selectedSubscription.month)}
                </p>
              </div>

              <button
                onClick={closePaymentHistory}
                className="bg-slate-200 text-slate-700 w-10 h-10 rounded-full hover:bg-slate-300"
              >
                ×
              </button>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-slate-500 mb-1">
                  المستحق
                </p>

                <p className="text-xl font-bold text-blue-700">
                  {selectedSubscription.dueAmount} جنيه
                </p>
              </div>

              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-slate-500 mb-1">
                  إجمالي المدفوع
                </p>

                <p className="text-xl font-bold text-green-700">
                  {paymentHistoryTotal} جنيه
                </p>
              </div>

              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-slate-500 mb-1">
                  المتبقي
                </p>

                <p className="text-xl font-bold text-red-700">
                  {selectedSubscription.remainingAmount} جنيه
                </p>
              </div>

            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-slate-500">
                جاري تحميل سجل المدفوعات...
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-xl text-slate-500">
                لا توجد مدفوعات مسجلة لهذا الاشتراك حتى الآن.
              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full min-w-[650px]">

                  <thead className="bg-slate-100">

                    <tr>
                      <th className="p-4 text-right">
                        #
                      </th>

                      <th className="p-4 text-right">
                        التاريخ
                      </th>

                      <th className="p-4 text-right">
                        المبلغ
                      </th>

                      <th className="p-4 text-right">
                        طريقة الدفع
                      </th>

                      <th className="p-4 text-right">
                        الملاحظات
                      </th>
                    </tr>

                  </thead>

                  <tbody>

                    {paymentHistory.map(function (payment, index) {
                      return (
                        <tr
                          key={payment.id}
                          className="border-t border-slate-100"
                        >

                          <td className="p-4 font-bold text-slate-500">
                            {index + 1}
                          </td>

                          <td className="p-4">
                            {payment.paymentDate || "-"}
                          </td>

                          <td className="p-4 font-bold text-green-600">
                            {payment.amount} جنيه
                          </td>

                          <td className="p-4">
                            <span className="bg-slate-100 px-3 py-1 rounded-full text-sm">
                              {payment.method || "-"}
                            </span>
                          </td>

                          <td className="p-4 text-slate-600">
                            {payment.notes || "-"}
                          </td>

                        </tr>
                      );
                    })}

                  </tbody>

                </table>

              </div>
            )}

            <div className="mt-6 flex justify-between items-center bg-slate-50 rounded-xl p-4">

              <div>
                <span className="text-slate-500">
                  عدد الدفعات:
                </span>

                <strong className="mr-2">
                  {paymentHistory.length}
                </strong>
              </div>

              <button
                onClick={closePaymentHistory}
                className="bg-slate-800 text-white px-6 py-3 rounded-xl hover:bg-slate-700"
              >
                إغلاق
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}