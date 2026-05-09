const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwvMUeOo6_u0-3NSuywehlJEOiS1R-25KDPVSmjc8lkWs2DVHwT0F8JVj2VB0JIqW-0/exec";
/*  */


const trackingForm = document.getElementById("trackingForm");
const trackButton = document.getElementById("trackButton");
const lookupStatus = document.getElementById("lookupStatus");
const resultCard = document.getElementById("resultCard");
const panelOrderId = document.getElementById("panelOrderId");
const panelSummary = document.getElementById("panelSummary");
const resultTitle = document.getElementById("resultTitle");
const statusPill = document.getElementById("statusPill");
const ordersList = document.getElementById("ordersList");

const STATUS_STEPS = [
  {
    key: "Received",
    title: "Received",
    detail: "Your watch has been checked in and logged by the service desk."
  },
  {
    key: "Inspection",
    title: "Inspection",
    detail: "A technician is inspecting the watch and confirming the service path."
  },
  {
    key: "Awaiting Approval",
    title: "Awaiting Approval",
    detail: "Ticksmith is waiting for customer approval before repair work begins."
  },
  {
    key: "In Service",
    title: "In Service",
    detail: "The repair or maintenance work is currently in progress."
  },
  {
    key: "Quality Check",
    title: "Quality Check",
    detail: "The completed work is being tested before release."
  },
  {
    key: "Ready for Pickup",
    title: "Ready for Pickup",
    detail: "Your watch is ready to collect from Ticksmith."
  },
  {
    key: "Completed",
    title: "Completed",
    detail: "The service order has been completed and closed."
  }
];

const STATUS_ALIASES = new Map([
  ["new", "Received"],
  ["received", "Received"],
  ["intake", "Received"],
  ["inspection", "Inspection"],
  ["diagnosis", "Inspection"],
  ["diagnostic", "Inspection"],
  ["awaiting approval", "Awaiting Approval"],
  ["approval pending", "Awaiting Approval"],
  ["pending approval", "Awaiting Approval"],
  ["in service", "In Service"],
  ["repairing", "In Service"],
  ["in repair", "In Service"],
  ["quality check", "Quality Check"],
  ["testing", "Quality Check"],
  ["ready", "Ready for Pickup"],
  ["ready for pickup", "Ready for Pickup"],
  ["ready for collection", "Ready for Pickup"],
  ["completed", "Completed"],
  ["closed", "Completed"],
  ["delivered", "Completed"],
  ["on hold", "On Hold"],
  ["hold", "On Hold"],
  ["cancelled", "Cancelled"],
  ["canceled", "Cancelled"]
]);

function setLookupStatus(message, type = "") {
  lookupStatus.textContent = message;
  lookupStatus.className = `form-status ${type}`.trim();
}

function getDisplayValue(value, fallback = "Not provided") {
  return value && String(value).trim() ? String(value).trim() : fallback;
}

function normalizeStatus(status) {
  const trimmed = getDisplayValue(status, "Received");
  return STATUS_ALIASES.get(trimmed.toLowerCase()) || trimmed;
}

function getStatusIndex(status) {
  return STATUS_STEPS.findIndex((step) => step.key === status);
}

function getJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `ticksmithLookup${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const script = document.createElement("script");
    let settled = false;
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("The lookup request timed out."));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete window[callbackName];
    }

    window[callbackName] = (payload) => {
      settled = true;
      cleanup();
      resolve(payload);
    };

    script.onload = () => {
      window.setTimeout(() => {
        if (!settled) {
          cleanup();
          reject(new Error("The tracker web app replied, but it is not deployed with the tracking code."));
        }
      }, 0);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Unable to reach the service tracker."));
    };

    const separator = url.includes("?") ? "&" : "?";
    script.src = `${url}${separator}callback=${encodeURIComponent(callbackName)}`;
    document.body.appendChild(script);
  });
}

function buildLookupUrl(phone) {
  const params = new URLSearchParams({
    action: "track",
    phone
  });

  return `${GOOGLE_SCRIPT_URL}?${params.toString()}`;
}

function renderTimeline(status, container) {
  const statusIndex = getStatusIndex(status);
  const safeIndex = statusIndex >= 0 ? statusIndex : 0;

  container.replaceChildren();
  STATUS_STEPS.forEach((step, index) => {
    const item = document.createElement("li");
    const dot = document.createElement("span");
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    const detail = document.createElement("span");

    item.className = "timeline-step";
    if (index < safeIndex) item.classList.add("done");
    if (index === safeIndex) item.classList.add("active");

    dot.className = "timeline-dot";
    dot.textContent = index < safeIndex ? "OK" : String(index + 1);
    copy.className = "timeline-copy";
    title.textContent = step.title;
    detail.textContent = step.detail;

    copy.append(title, detail);
    item.append(dot, copy);
    container.append(item);
  });
}

function createSummaryItem(label, value) {
  const item = document.createElement("div");
  const itemLabel = document.createElement("span");
  const itemValue = document.createElement("strong");

  item.className = "summary-item";
  itemLabel.textContent = label;
  itemValue.textContent = getDisplayValue(value);
  item.append(itemLabel, itemValue);

  return item;
}

function createNoteBlock(label, value) {
  const block = document.createElement("div");
  const blockLabel = document.createElement("span");
  const blockValue = document.createElement("p");

  block.className = "note-block";
  blockLabel.textContent = label;
  blockValue.textContent = getDisplayValue(value);
  block.append(blockLabel, blockValue);

  return block;
}

function createOrderCard(order) {
  const status = normalizeStatus(order.serviceStatus);
  const watchName = [order.brand, order.model].filter(Boolean).join(" ");
  const specialState = status.toLowerCase();
  const card = document.createElement("article");
  const cardHeader = document.createElement("div");
  const titleWrap = document.createElement("div");
  const orderLabel = document.createElement("p");
  const orderTitle = document.createElement("h3");
  const orderStatus = document.createElement("span");
  const summaryGrid = document.createElement("div");
  const detailsLayout = document.createElement("div");
  const timelineSection = document.createElement("section");
  const timelineLabel = document.createElement("p");
  const timeline = document.createElement("ol");
  const notesSection = document.createElement("section");
  const notesLabel = document.createElement("p");
  const contactStrip = document.createElement("div");
  const contactLabel = document.createElement("span");
  const contactText = document.createElement("strong");

  card.className = "order-card";
  cardHeader.className = "order-card-heading";
  orderLabel.className = "section-tag";
  orderLabel.textContent = "Order Reference";
  orderTitle.textContent = getDisplayValue(order.orderId);
  orderStatus.className = "status-pill";
  orderStatus.textContent = status;

  if (["completed", "ready for pickup"].includes(specialState)) {
    orderStatus.classList.add("complete");
  }
  if (["on hold", "cancelled"].includes(specialState)) {
    orderStatus.classList.add("hold");
  }

  titleWrap.append(orderLabel, orderTitle);
  cardHeader.append(titleWrap, orderStatus);

  summaryGrid.className = "summary-grid";
  summaryGrid.append(
    createSummaryItem("Customer", order.customerName),
    createSummaryItem("Watch", watchName),
    createSummaryItem("Requested Service", order.serviceType),
    createSummaryItem("Promised Date", order.promisedDate)
  );

  detailsLayout.className = "details-layout";
  timelineSection.className = "timeline-section";
  timelineLabel.className = "panel-label";
  timelineLabel.textContent = "Progress";
  timeline.className = "status-timeline";
  renderTimeline(status, timeline);
  timelineSection.append(timelineLabel, timeline);

  notesSection.className = "notes-section";
  notesLabel.className = "panel-label";
  notesLabel.textContent = "Service Notes";
  contactStrip.className = "contact-strip";
  contactLabel.textContent = "Need help?";
  contactText.textContent = `Contact Ticksmith with order ${getDisplayValue(order.orderId)}.`;
  contactStrip.append(contactLabel, contactText);
  notesSection.append(
    notesLabel,
    createNoteBlock("Reported Issue", order.issueDescription),
    createNoteBlock("Accessories Received", order.accessories),
    contactStrip
  );

  detailsLayout.append(timelineSection, notesSection);
  card.append(cardHeader, summaryGrid, detailsLayout);

  return card;
}

function renderResult(orders) {
  const orderCount = orders.length;
  if (!orderCount) {
    throw new Error("No matching service orders were found.");
  }

  const firstOrder = orders[0];
  const firstWatchName = [firstOrder.brand, firstOrder.model].filter(Boolean).join(" ");

  ordersList.replaceChildren();
  orders.forEach((order) => {
    ordersList.append(createOrderCard(order));
  });

  panelOrderId.textContent = `${orderCount} order${orderCount === 1 ? "" : "s"} found`;
  panelSummary.textContent = `${getDisplayValue(firstOrder.customerName, "This customer")} has ${orderCount} service order${orderCount === 1 ? "" : "s"} linked to this phone number. Latest shown includes ${getDisplayValue(firstWatchName, "watch service")}.`;
  resultTitle.textContent = `${orderCount} service order${orderCount === 1 ? "" : "s"}`;
  statusPill.textContent = `${orderCount} order${orderCount === 1 ? "" : "s"}`;
  statusPill.className = "status-pill";
  resultCard.classList.remove("hidden");
  resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

trackingForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(trackingForm);
  const phone = String(formData.get("phone") || "").trim();

  if (!phone) {
    setLookupStatus("Enter the phone number used for service intake.", "error");
    return;
  }

  trackButton.disabled = true;
  resultCard.classList.add("hidden");
  setLookupStatus("Checking service status...");

  try {
    const response = await getJsonp(buildLookupUrl(phone));
    if (!response.success) {
      throw new Error(response.message || "No matching service orders were found.");
    }

    renderResult(response.orders || []);
    setLookupStatus("Service orders loaded.", "success");
  } catch (error) {
    panelOrderId.textContent = "Not found";
    panelSummary.textContent = "Check the phone number from the original intake.";
    setLookupStatus(error.message, "error");
  } finally {
    trackButton.disabled = false;
  }
});
