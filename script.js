const PRICE = 50;
const quantity = document.getElementById("quantity");
const total = document.getElementById("total");
const dateInput = document.getElementById("date");
const phoneInput = document.getElementById("phone");
const toast = document.getElementById("toast");

function updateTotal() {
  let q = parseInt(quantity.value, 10) || 1;
  q = Math.max(1, Math.min(50, q));
  quantity.value = q;
  total.textContent = `₹${q * PRICE}`;
}
document.getElementById("minus").onclick = () => { quantity.value = Math.max(1,(parseInt(quantity.value)||1)-1); updateTotal(); };
document.getElementById("plus").onclick = () => { quantity.value = Math.min(50,(parseInt(quantity.value)||1)+1); updateTotal(); };
quantity.oninput = updateTotal;
phoneInput.oninput = () => phoneInput.value = phoneInput.value.replace(/\D/g,"").slice(0,10);

const now = new Date(); now.setHours(0,0,0,0);
const minDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
dateInput.min = minDate; dateInput.value = minDate;

function clearErrors(){ document.querySelectorAll(".error").forEach(x=>x.textContent=""); }
function error(id,msg){ document.getElementById(id).textContent=msg; }
function toastMsg(msg){ toast.textContent=msg; toast.classList.add("show"); setTimeout(()=>toast.classList.remove("show"),3500); }

document.getElementById("orderForm").addEventListener("submit", async e => {
  e.preventDefault(); clearErrors();
  const order = {
    name: document.getElementById("name").value.trim(),
    phone: phoneInput.value.trim(),
    quantity: Number(quantity.value),
    deliveryDate: dateInput.value,
    address: document.getElementById("address").value.trim(),
    notes: document.getElementById("notes").value.trim()
  };
  let ok=true;
  if(order.name.length<2){error("nameError","Please enter your name.");ok=false;}
  if(!/^[6-9]\d{9}$/.test(order.phone)){error("phoneError","Enter a valid 10-digit Indian mobile number.");ok=false;}
  if(!Number.isInteger(order.quantity)||order.quantity<1||order.quantity>50){error("quantityError","Quantity must be 1–50 litres.");ok=false;}
  if(!order.deliveryDate||new Date(order.deliveryDate+"T00:00:00")<now){error("dateError","Choose today or a future date.");ok=false;}
  if(order.address.length<5){error("addressError","Enter your Palamaner delivery address.");ok=false;}
  if(!ok){toastMsg("Please correct the highlighted fields.");return;}

  try {
    const r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(order)});
    const data=await r.json();
    if(!r.ok) throw new Error(data.message||"Order failed.");
    const o=data.order;
    const readable=new Date(o.deliveryDate+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
    const deliveryNote = "Delivery is available only between 7:00 AM to 9:00 AM and 7:00 PM to 9:00 PM.";
    toastMsg(`Order ${o.id} placed successfully. ${deliveryNote}`);
    document.getElementById("orderForm").reset(); dateInput.value=minDate; quantity.value=1; updateTotal();
  } catch(err) { console.error(err); toastMsg("Unable to place order. Please call 7989844899."); }
});
document.getElementById("year").textContent=new Date().getFullYear();
updateTotal();
