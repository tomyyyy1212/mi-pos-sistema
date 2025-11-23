import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingUp, 
  Plus, 
  Minus, 
  Trash2, 
  Save, 
  Search, 
  Menu, 
  X, 
  ChevronRight, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  LogOut, 
  Truck, 
  History, 
  Receipt, 
  Eye, 
  UserPlus, 
  Calendar, 
  Filter, 
  Tag, 
  Briefcase, 
  ChevronLeft, 
  BarChart3, 
  Award, 
  PieChart, 
  Clock, 
  AlertCircle,
  Check,
  FileText,
  Share2,
  MessageCircle,
  Smartphone,
  AlertTriangle,
  BookOpen,
  CreditCard,
  Banknote
} from 'lucide-react';

// Importamos las funciones de Firebase necesarias
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics"; 
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp, 
  deleteDoc, 
  writeBatch, 
  getDocs, 
  where, 
  limit
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken, signOut } from 'firebase/auth';

// --- TU CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAI9cFjrbq9_Sp1zt84A12_YaO2T4OQQQE",
  authDomain: "negocio-51df2.firebaseapp.com",
  databaseURL: "https://negocio-51df2-default-rtdb.firebaseio.com",
  projectId: "negocio-51df2",
  storageBucket: "negocio-51df2.firebasestorage.app",
  messagingSenderId: "394431118056",
  appId: "1:394431118056:web:b383489e2fc49951f5e75d",
  measurementId: "G-S392P9NCXH"
};

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app); 
const auth = getAuth(app);
const db = getFirestore(app);

// ID Fijo para producción 
const appId = 'negocio-produccion'; 

// --- Tipos de Datos ---
interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
  contact?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string; 
}

interface InventoryBatch {
  id: string;
  productId: string;
  cost: number;
  quantity: number;
  date: any;
}

interface FifoDetail {
  cost: number;
  qty: number;
  date: any;
}

interface CartItem extends Product {
  qty: number;
  transactionPrice: number;
  calculatedCost?: number;
  fifoDetails?: FifoDetail[];
}

interface Client {
  id: string;
  name: string;
  department?: string;
  phone?: string;
  email?: string;
}

interface Transaction {
  id: string;
  type: 'sale' | 'purchase';
  total: number;
  totalCost?: number;
  items: CartItem[];
  clientId?: string; 
  paymentMethod?: 'Efectivo' | 'Transferencia'; 
  date: any;
}

// --- Componente Principal ---
export default function PosApp() {

  const formatMoney = (amount: number) => {
    return amount.toLocaleString('es-CL', {
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0  
    });
  };
  
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'pos' | 'inventory' | 'clients' | 'reports' | 'purchases' | 'receipts'>('reports');
    
  // Data Collections
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
    
  // Cart & UI State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia' | ''>(''); 
    
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingMsg, setProcessingMsg] = useState('');

  // Estado de Alerta Personalizada
  const [alertState, setAlertState] = useState<{ show: boolean, title: string, message: string, type?: 'error' | 'success' }>({ show: false, title: '', message: '' });

  // Modales
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [showPreTicket, setShowPreTicket] = useState(false); 
  const [showStockAlertModal, setShowStockAlertModal] = useState(false); 
  const [showCatalogModal, setShowCatalogModal] = useState(false); 
    
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productPriceInput, setProductPriceInput] = useState(''); // NUEVO ESTADO PARA INPUT PRECIO
  const [receiptDetails, setReceiptDetails] = useState<Transaction | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
    
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);

  // Filtros Recibos
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filtros Historial Compras
  const [phStartDate, setPhStartDate] = useState('');
  const [phEndDate, setPhEndDate] = useState('');
  const [phSupplier, setPhSupplier] = useState('');
  const [phProduct, setPhProduct] = useState('');
  const [showPhFilters, setShowPhFilters] = useState(false);

  // --- NUEVOS ESTADOS ---
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientOptions, setShowClientOptions] = useState(false);
  const clientInputRef = useRef<HTMLInputElement>(null);

  // Números para reporte de stock (Persistentes)
  const [reportPhones, setReportPhones] = useState<{phone1: string, phone2: string}>(() => {
      const saved = localStorage.getItem('stock_report_phones');
      return saved ? JSON.parse(saved) : { phone1: '', phone2: '' };
  });

  useEffect(() => {
      localStorage.setItem('stock_report_phones', JSON.stringify(reportPhones));
  }, [reportPhones]);


  // Filtros REPORTES
  const [reportStartDate, setReportStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA'); 
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    return new Date().toLocaleDateString('en-CA'); 
  });

  // --- Autenticación ---
  useEffect(() => {
    const initAuth = async () => {
      await signInAnonymously(auth).catch((error) => {
          console.error("Error en autenticación anónima:", error);
      });
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Lectura de Datos ---
  useEffect(() => {
    if (!user) return;

    const productsRef = collection(db, 'artifacts', appId, 'public', 'data', 'products');
    const clientsRef = collection(db, 'artifacts', appId, 'public', 'data', 'clients');
    const categoriesRef = collection(db, 'artifacts', appId, 'public', 'data', 'categories');
    const suppliersRef = collection(db, 'artifacts', appId, 'public', 'data', 'suppliers');
    const transRef = collection(db, 'artifacts', appId, 'public', 'data', 'transactions');

    const unsubProducts = onSnapshot(productsRef, (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() } as Product)).sort((a,b) => a.name.localeCompare(b.name))));
    const unsubClients = onSnapshot(clientsRef, (s) => setClients(s.docs.map(d => ({ id: d.id, ...d.data() } as Client)).sort((a,b) => a.name.localeCompare(b.name))));
    const unsubCategories = onSnapshot(categoriesRef, (s) => setCategories(s.docs.map(d => ({ id: d.id, ...d.data() } as Category)).sort((a,b) => a.name.localeCompare(b.name))));
    const unsubSuppliers = onSnapshot(suppliersRef, (s) => setSuppliers(s.docs.map(d => ({ id: d.id, ...d.data() } as Supplier)).sort((a,b) => a.name.localeCompare(b.name))));

    const qTrans = query(transRef, orderBy('date', 'desc'), limit(500));
    const unsubTrans = onSnapshot(qTrans, (s) => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))));

    return () => {
      unsubProducts(); unsubClients(); unsubCategories(); unsubSuppliers(); unsubTrans();
    };
  }, [user]);

  // --- Manejo de Click fuera del Autocomplete ---
  useEffect(() => {
      const handleClickOutside = (event: any) => {
          if (clientInputRef.current && !clientInputRef.current.contains(event.target)) {
              setShowClientOptions(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // --- Helper de Alertas Visuales ---
  const triggerAlert = (title: string, message: string, type: 'error' | 'success' = 'error') => {
    setAlertState({ show: true, title, message, type });
  };

  // --- Helpers Lógica de Stock Visual ---
  const getStockStatus = (stock: number) => {
      if (stock === 0) return { color: 'bg-red-600 text-white', label: 'AGOTADO' };
      if (stock === 1) return { color: 'bg-red-100 text-red-700 border border-red-200', label: 'CRÍTICO' };
      if (stock > 1 && stock < 4) return { color: 'bg-yellow-100 text-yellow-800 border border-yellow-200', label: 'BAJO' };
      return { color: 'bg-green-100 text-green-700 border border-green-200', label: 'BIEN' };
  };

  // --- Helpers WhatsApp de Stock (Interno) ---
  const handleSendStockReport = (phoneNumber: string) => {
      if (!phoneNumber) {
          triggerAlert("Falta número", "Ingresa un número de teléfono primero.");
          return;
      }
      
      const lowStockItems = products.filter(p => p.stock < 4);
      
      if (lowStockItems.length === 0) {
          triggerAlert("Todo bien", "No hay productos con stock crítico o bajo.");
          return;
      }

      const critical = lowStockItems.filter(p => p.stock <= 1);
      const warning = lowStockItems.filter(p => p.stock > 1);

      let message = `🚨 *REPORTE DE STOCK* 🚨\nFecha: ${new Date().toLocaleDateString()}\n\n`;

      if (critical.length > 0) {
          message += `🔴 *CRÍTICOS / AGOTADOS:*\n`;
          critical.forEach(p => message += `- ${p.name}: ${p.stock} u.\n`);
          message += `\n`;
      }

      if (warning.length > 0) {
          message += `🟡 *STOCK BAJO:*\n`;
          warning.forEach(p => message += `- ${p.name}: ${p.stock} u.\n`);
      }

      const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  // --- Helpers WhatsApp de Catálogo (Cliente) ---
  const handleSendCatalog = (categoryId: string) => {
      let itemsToSend = products;
      let catName = "CATÁLOGO COMPLETO";

      if (categoryId !== 'ALL') {
          itemsToSend = products.filter(p => p.category === categoryId);
          const cat = categories.find(c => c.id === categoryId);
          if (cat) catName = cat.name.toUpperCase();
      }

      // 1. Filtrar solo productos con stock
      itemsToSend = itemsToSend.filter(p => p.stock > 0);

      // Ordenar alfabéticamente
      itemsToSend.sort((a,b) => a.name.localeCompare(b.name));

      if (itemsToSend.length === 0) {
          triggerAlert("Sin productos", "No hay productos con stock en esta categoría para enviar.");
          return;
      }

      let message = `*${catName}*\n\n`;
      itemsToSend.forEach(p => {
          message += `* ${p.name} - $${formatMoney(p.price)}\n`;
      });
      
      // Abrir WhatsApp sin número predefinido para que el usuario elija el contacto
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
      setShowCatalogModal(false);
  };


  // --- Helpers CRUD (Delete) ---
  const handleDeleteProduct = async (productId: string) => {
      if(window.confirm("¿Estás seguro de eliminar este producto?")) {
          try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', productId));
            triggerAlert("Eliminado", "Producto eliminado correctamente", "success");
          } catch (e) {
             triggerAlert("Error", "No se pudo eliminar el producto");
          }
      }
  }

  // --- Lógica del Carrito ---
  const addToCart = (product: Product) => {
    if (view === 'pos') {
        const existingItem = cart.find(p => p.id === product.id);
        const currentQtyInCart = existingItem ? existingItem.qty : 0;
        if (currentQtyInCart + 1 > product.stock) {
            triggerAlert("Stock Insuficiente", `Solo quedan ${product.stock} unidades disponibles de ${product.name}.`);
            return;
        }
    }
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p);
      }
      const initialPrice = view === 'purchases' ? 0 : product.price;
      return [...prev, { ...product, transactionPrice: initialPrice, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(p => p.id !== productId));
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(p => {
      if (p.id === productId) {
        const newQty = Math.max(1, p.qty + delta);
        if (view === 'pos' && delta > 0) {
             const product = products.find(prod => prod.id === productId);
             if (product && newQty > product.stock) {
                 triggerAlert("Límite de Stock", `No puedes agregar más unidades. Stock máximo: ${product.stock}`);
                 return p;
             }
        }
        return { ...p, qty: newQty };
      }
      return p;
    }));
  };

  const updateTransactionPrice = (productId: string, newPrice: number) => {
    setCart(prev => prev.map(p => {
      if (p.id === productId) return { ...p, transactionPrice: newPrice };
      return p;
    }));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedClient('');
    setClientSearchTerm(''); 
    setSelectedSupplier('');
    setPaymentMethod(''); // Limpiar medio de pago
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.transactionPrice * item.qty), 0);
  }, [cart]);

  // --- WhatsApp Helpers (Venta) ---
  const handleWhatsAppShare = () => {
      let clientPhone = '';
      let clientName = 'Vecin@';

      if (selectedClient && selectedClient !== 'Consumidor Final') {
          const c = clients.find(cl => cl.id === selectedClient);
          if (c) {
              clientName = c.name;
              if(c.phone) clientPhone = c.phone;
          }
      }

      const lines = cart.map(item => `- ${item.name} (${item.qty} x $${formatMoney(item.transactionPrice)}) = $${formatMoney(item.qty * item.transactionPrice)}`);
      const message = `aquí está el resumen de tu pedido:\n\n${lines.join('\n')}\n\n*TOTAL: $${formatMoney(cartTotal)}*`;
      
      const encoded = encodeURIComponent(message);
      const url = `https://wa.me/${clientPhone}?text=${encoded}`;
      window.open(url, '_blank');
  };


  // --- LÓGICA CORE: Transacciones ---
  const handleTransaction = async () => {
    if (cart.length === 0) {
        triggerAlert("Carrito Vacío", "Agrega productos antes de continuar.");
        return;
    }
      
    const type = view === 'purchases' ? 'purchase' : 'sale';

    if (type === 'sale') {
        if (!selectedClient) {
            triggerAlert("Falta Cliente", "Es OBLIGATORIO seleccionar un cliente para realizar la venta.");
            return;
        }
        // VALIDACIÓN DE PAGO
        if (!paymentMethod) {
            triggerAlert("Falta Medio de Pago", "Selecciona si es Efectivo o Transferencia.");
            return;
        }
    }

    if (type === 'purchase') {
        if (!selectedSupplier) {
            triggerAlert("Falta Proveedor", "Debes seleccionar un proveedor para registrar el abastecimiento.");
            return;
        }
        const invalidItems = cart.filter(item => item.transactionPrice <= 0);
        if (invalidItems.length > 0) {
            triggerAlert("Costo Inválido", `El costo de abastecimiento no puede ser 0. Revisa: ${invalidItems.map(i => i.name).join(', ')}.`);
            return;
        }
    }

    setLoading(true);
    setProcessingMsg(type === 'purchase' ? 'Registrando Lotes...' : 'Calculando Costos FIFO...');

    try {
      const batch = writeBatch(db);
      let totalTransactionCost = 0; 
      const finalCartItems: CartItem[] = []; 

      for (const item of cart) {
        const productRef = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.id);
          
        if (type === 'purchase') {
          const batchRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'inventory_batches'));
          const newBatch: InventoryBatch = {
            id: batchRef.id,
            productId: item.id,
            cost: item.transactionPrice, 
            quantity: item.qty,
            date: Timestamp.now()
          };
          batch.set(batchRef, newBatch);
            
          const currentProd = products.find(p => p.id === item.id);
          if (currentProd) {
            batch.update(productRef, { stock: currentProd.stock + item.qty });
          }
          finalCartItems.push(item);

        } else {
          let remainingQtyToSell = item.qty;
          let itemTotalCost = 0;
          const currentItemFifoDetails: FifoDetail[] = [];

          const batchesRef = collection(db, 'artifacts', appId, 'public', 'data', 'inventory_batches');
          const q = query(batchesRef, where('productId', '==', item.id));
          const snapshot = await getDocs(q);
            
          const availableBatches = snapshot.docs
            .map(d => ({...d.data(), ref: d.ref} as InventoryBatch & { ref: any }))
            .filter(b => b.quantity > 0)
            .sort((a, b) => (a.date?.seconds || 0) - (b.date?.seconds || 0));

          for (const invBatch of availableBatches) {
            if (remainingQtyToSell <= 0) break;

            const take = Math.min(invBatch.quantity, remainingQtyToSell);
            const costForThisPart = take * invBatch.cost;
              
            itemTotalCost += costForThisPart;
              
            itemTotalCost += costForThisPart;
              
            currentItemFifoDetails.push({
                cost: invBatch.cost,
                qty: take,
                date: invBatch.date
            });
              
            batch.update(invBatch.ref, { quantity: invBatch.quantity - take });
            remainingQtyToSell -= take;
          }

          totalTransactionCost += itemTotalCost;

          const currentProd = products.find(p => p.id === item.id);
          if (currentProd) {
            batch.update(productRef, { stock: currentProd.stock - item.qty });
          }

          finalCartItems.push({
            ...item,
            calculatedCost: itemTotalCost,
            fifoDetails: currentItemFifoDetails
          });
        }
      }

      const transRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'));
      const transactionData: any = {
        type,
        items: finalCartItems,
        total: cartTotal,
        clientId: type === 'purchase' ? selectedSupplier : selectedClient,
        date: Timestamp.now()
      };

      if (type === 'sale') {
        transactionData.totalCost = totalTransactionCost;
        transactionData.paymentMethod = paymentMethod; // GUARDAMOS EL MEDIO DE PAGO
      }

      batch.set(transRef, transactionData);
      await batch.commit();
      clearCart();
      triggerAlert("Éxito", "Transacción registrada correctamente.", "success");
        
    } catch (error) {
      console.error("Error transaction:", error);
      triggerAlert("Error", "Ocurrió un error al procesar la transacción. Revisa la consola.");
    }
    setLoading(false);
    setProcessingMsg('');
  };

  // --- CRUD Helpers ---
  const simpleSave = async (collectionName: string, data: any, isModalOpenSetter: any) => {
    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', collectionName), data);
        isModalOpenSetter(false);
    } catch(e) { console.error(e); }
  };

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Limpieza del precio (eliminar $ y puntos)
    const rawPrice = formData.get('price') as string;
    const priceNumber = parseInt(rawPrice.replace(/\D/g, ''), 10) || 0;

    const productData = {
      name: formData.get('name') as string,
      price: priceNumber, // Guardamos el número limpio
      category: formData.get('category') as string,
    };
    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editingProduct.id), productData);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { ...productData, stock: 0 });
      }
      setIsProductModalOpen(false); 
      setEditingProduct(null);
      setProductPriceInput(''); // Reset input
    } catch (error) { console.error(error); }
  };

  const handleSaveClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const department = (formData.get('department') as string) || '';
    const phone = (formData.get('phone') as string) || '';
    const email = (formData.get('email') as string) || '';

    if (department) {
        const exists = clients.find(c => c.department?.toLowerCase() === department.toLowerCase());
        if (exists) {
            triggerAlert("Departamento Duplicado", `Ya existe un cliente en el depto "${department}" (${exists.name}). No se puede duplicar.`);
            return;
        }
    }

    const clientData = { name, department, phone, email };

    try {
        const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), clientData);
        setIsClientModalOpen(false);
        if (view === 'pos') {
             setSelectedClient(docRef.id);
             setClientSearchTerm(name); 
        }
        triggerAlert("Cliente Creado", "El cliente se registró correctamente.", "success");
    } catch (e) { 
        console.error(e); 
        triggerAlert("Error", "No se pudo crear el cliente.");
    }
  };

  // --- Filtros y Utiles ---
  
  const filteredProducts = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategoryFilter === 'ALL' || p.category === selectedCategoryFilter;

      return matchesSearch && matchesCategory;
  });

  const filteredClientsForSearch = clients.filter(c => {
      const term = clientSearchTerm.toLowerCase();
      return c.name.toLowerCase().includes(term) || (c.department && c.department.toLowerCase().includes(term));
  });


  const getFilteredTransactions = (type: 'sale' | 'purchase', start: string, end: string, entityId: string, productSearch: string) => {
    let filtered = transactions.filter(t => t.type === type);
    if (entityId) filtered = filtered.filter(t => t.clientId === entityId);
      
    if (start) {
        const s = new Date(`${start}T00:00:00`);
        filtered = filtered.filter(t => {
            const d = t.date?.toDate ? t.date.toDate() : new Date(t.date?.seconds * 1000);
            return d >= s;
        });
    }
    if (end) {
        const e = new Date(`${end}T23:59:59.999`);
        filtered = filtered.filter(t => {
            const d = t.date?.toDate ? t.date.toDate() : new Date(t.date?.seconds * 1000);
            return d <= e;
        });
    }
      
    if (productSearch) {
        const lower = productSearch.toLowerCase();
        filtered = filtered.filter(t => t.items.some(i => i.name.toLowerCase().includes(lower)));
    }
    return filtered;
  };

  const filteredSales = useMemo(() => getFilteredTransactions('sale', filterStartDate, filterEndDate, filterClient, filterProduct), [transactions, filterStartDate, filterEndDate, filterClient, filterProduct]);
  const filteredPurchases = useMemo(() => getFilteredTransactions('purchase', phStartDate, phEndDate, phSupplier, phProduct), [transactions, phStartDate, phEndDate, phSupplier, phProduct]);

  const getClientName = (id?: string) => {
    if (!id || id === 'Consumidor Final') return 'Consumidor Final';
    const client = clients.find(c => c.id === id);
    return client ? `${client.name} ${client.department ? `(${client.department})` : ''}` : 'Cliente Desconocido';
  };

  const getSupplierName = (id?: string) => {
      if(!id) return 'Proveedor Desconocido';
      return suppliers.find(s => s.id === id)?.name || 'Proveedor Eliminado';
  }

  // --- LÓGICA DE REPORTES AVANZADOS ---
  const setQuickDate = (type: 'today' | 'yesterday' | 'week' | 'month') => {
      const now = new Date();
      const formatDate = (d: Date) => d.toLocaleDateString('en-CA');
        
      let start = new Date();
      let end = new Date();

      if (type === 'today') {
          // Start y End son hoy
      } else if (type === 'yesterday') {
          start.setDate(start.getDate() - 1);
          end.setDate(end.getDate() - 1);
      } else if (type === 'week') {
          const day = start.getDay();
          const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
          start.setDate(diff);
      } else if (type === 'month') {
          start.setDate(1);
      }

      setReportStartDate(formatDate(start));
      setReportEndDate(formatDate(end));
  };

  const reportData = useMemo(() => {
    const start = new Date(`${reportStartDate}T00:00:00`);
    const end = new Date(`${reportEndDate}T23:59:59.999`);

    const reportTrans = transactions.filter(t => {
        if (t.type !== 'sale') return false;
        if (!t.date) return false;
          
        const d = t.date.toDate ? t.date.toDate() : new Date(t.date.seconds * 1000);
        return d >= start && d <= end;
    });

    const totalSales = reportTrans.reduce((acc, t) => acc + t.total, 0);
      
    const totalCost = reportTrans.reduce((acc, t) => {
        let cost = t.totalCost;
        if (cost === undefined) {
            cost = t.items.reduce((sum, item) => sum + (item.calculatedCost || 0), 0);
        }
        return acc + cost;
    }, 0);

    const margin = totalSales - totalCost;
    const marginPercent = totalSales > 0 ? (margin / totalSales) * 100 : 0;

    const sortedTransForTimeline = [...reportTrans].sort((a,b) => (a.date?.seconds || 0) - (b.date?.seconds || 0));
    const timelineData: {date: string, total: number}[] = [];
    sortedTransForTimeline.forEach(t => {
        const d = t.date.toDate ? t.date.toDate() : new Date(t.date.seconds * 1000);
        const dateKey = d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
          
        const existing = timelineData.find(d => d.date === dateKey);
        if(existing) existing.total += t.total;
        else timelineData.push({ date: dateKey, total: t.total });
    });

    const productMap = new Map<string, { name: string, qty: number, revenue: number }>();
    reportTrans.forEach(t => {
        t.items.forEach(item => {
            const existing = productMap.get(item.id);
            if (existing) {
                existing.qty += item.qty;
                existing.revenue += (item.qty * item.transactionPrice);
            } else {
                productMap.set(item.id, { name: item.name, qty: item.qty, revenue: item.qty * item.transactionPrice });
            }
        });
    });
    const productRanking = Array.from(productMap.values()).sort((a,b) => b.revenue - a.revenue).slice(0, 5);

    const clientMap = new Map<string, { name: string, count: number, revenue: number }>();
    reportTrans.forEach(t => {
        const cId = t.clientId || 'unknown';
        const cName = getClientName(cId);
        const existing = clientMap.get(cId);
        if (existing) {
            existing.count += 1;
            existing.revenue += t.total;
        } else {
            clientMap.set(cId, { name: cName, count: 1, revenue: t.total });
        }
    });
    const clientRanking = Array.from(clientMap.values()).sort((a,b) => b.revenue - a.revenue).slice(0, 5);

    return { totalSales, totalCost, margin, marginPercent, timelineData, productRanking, clientRanking };
  }, [transactions, reportStartDate, reportEndDate, clients]);

  if (!user && loading) return <div className="flex h-screen items-center justify-center bg-slate-100">Cargando...</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
        
      {/* Alerta Visual Personalizada */}
      {alertState.show && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className={`p-3 rounded-full mb-4 ${alertState.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">{alertState.title}</h3>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">{alertState.message}</p>
                    <button 
                        onClick={() => setAlertState({ ...alertState, show: false })}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg active:scale-95 transition-transform ${alertState.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Header */}
      <header className={`${view === 'purchases' ? 'bg-emerald-600' : view === 'receipts' ? 'bg-purple-600' : 'bg-blue-600'} transition-colors duration-300 text-white p-4 shadow-md flex justify-between items-center z-10 shrink-0`}>
        <h1 className="font-bold text-lg flex items-center gap-2">
          {view === 'pos' && <ShoppingCart className="w-5 h-5" />}
          {view === 'inventory' && <Package className="w-5 h-5" />}
          {view === 'purchases' && <Truck className="w-5 h-5" />}
          {view === 'receipts' && <Receipt className="w-5 h-5" />}
          {view === 'reports' && <LayoutDashboard className="w-5 h-5" />}
            
          {view === 'pos' ? 'Punto de Venta' : 
           view === 'inventory' ? 'Inventario' :
           view === 'clients' ? 'Clientes' :
           view === 'purchases' ? (showPurchaseHistory ? 'Historial Compras' : 'Abastecimiento') :
           view === 'receipts' ? 'Recibos' : 'Dashboard'}
        </h1>
        <div className="text-xs bg-white/20 px-2 py-1 rounded">{user ? 'En línea' : 'Offline'}</div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 overflow-hidden relative flex flex-col ${view !== 'pos' && view !== 'purchases' ? 'overflow-y-auto' : ''}`}>
        
        {loading && processingMsg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
             <div className="bg-white p-4 rounded-lg shadow-xl font-bold flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              {processingMsg}
            </div>
          </div>
        )}

        {/* VISTA: POS y ABASTECIMIENTO (LAYOUT "STICKY") */}
        {(view === 'pos' || view === 'purchases') && !showPurchaseHistory && (
          <div className="flex flex-col h-full relative"> {/* Contenedor Flex Completo */}
            
            {view === 'purchases' && (
               <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex justify-between items-center shrink-0">
                 <div className="text-xs text-emerald-700 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    <span>Registro de costos.</span>
                 </div>
                 <button onClick={() => setShowPurchaseHistory(true)} className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded flex items-center gap-1">
                     <History className="w-3 h-3" /> Historial
                 </button>
               </div>
            )}

            {/* 1. BUSCADOR + FILTROS (Sticky arriba) */}
            <div className="p-4 bg-slate-50 z-10 shrink-0 shadow-sm border-b border-slate-200 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Buscar producto..." 
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* FILTRO DE CATEGORIAS (Visible también en Ventas) */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  <button 
                      onClick={() => setSelectedCategoryFilter('ALL')}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${selectedCategoryFilter === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                      Todos
                  </button>
                  {categories.map(c => (
                      <button 
                          key={c.id}
                          onClick={() => setSelectedCategoryFilter(c.id)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${selectedCategoryFilter === c.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                      >
                          {c.name}
                      </button>
                  ))}
              </div>
            </div>

            {/* 2. GRID DE PRODUCTOS (Scrollable) */}
            {/* Agregamos padding-bottom grande para que el contenido no quede oculto tras el panel fijo */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-48"> 
                <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map(product => {
                    const status = getStockStatus(product.stock);
                    return (
                        <button 
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 active:scale-95 transition-transform text-left flex flex-col justify-between h-28 relative overflow-hidden"
                        >
                        {product.stock <= 0 && view === 'pos' && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 backdrop-blur-[1px]">
                                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded -rotate-12 border border-red-200">AGOTADO</span>
                            </div>
                        )}
                        <span className="font-medium line-clamp-2 text-sm leading-tight text-slate-700">{product.name}</span>
                        <div className="flex justify-between items-end mt-2">
                            <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase">Precio</span>
                            <span className="font-bold text-blue-600 text-lg">${formatMoney(product.price)}</span>
                            </div>
                            <div className={`text-[10px] px-2 py-1 rounded-lg font-bold flex flex-col items-center ${status.color}`}>
                                <span>{product.stock}</span>
                                <span className="text-[8px] font-normal">{status.label}</span>
                            </div>
                        </div>
                        </button>
                    );
                })}
                </div>
            </div>

            {/* 3. CARRITO (Modificado: FIXED position y Max Height en lista) */}
            {cart.length > 0 && (
              <div className="fixed bottom-[76px] left-0 w-full z-20 flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom duration-300">
                  {/* Se usa bottom-[76px] aprox para que quede justo encima del menú inferior */}
                  
                  <div className="bg-white rounded-t-3xl border-t border-slate-100 flex flex-col">
                    
                    {/* Lista de Items (LIMITADA A 2 ITEMS VISUALES) */}
                    <div className="max-h-48 overflow-y-auto p-4 border-b border-slate-50">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">
                          {view === 'pos' ? 'Detalle Venta' : 'Entrada Stock'}
                        </h3>
                        <button onClick={clearCart} className="text-red-500 text-[10px] font-bold px-2 py-1 bg-red-50 rounded hover:bg-red-100">Vaciar</button>
                      </div>
                        
                      {cart.map(item => (
                        <div key={item.id} className="flex flex-col mb-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0 last:mb-0">
                            
                            {/* CABECERA ITEM: NOMBRE + ELIMINAR */}
                             <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-medium flex-1 text-slate-800 line-clamp-1">{item.name}</span>
                                <button onClick={() => removeFromCart(item.id)} className="text-red-400 ml-2"><X className="w-4 h-4" /></button>
                             </div>

                             {/* CONTROLES: CANTIDAD Y PRECIO/COSTO */}
                             <div className="flex items-center justify-between gap-2">
                                {/* Control Cantidad */}
                                <div className="flex items-center bg-slate-100 rounded-lg">
                                    <button onClick={() => updateQty(item.id, -1)} className="p-2 hover:bg-slate-200 rounded-l-lg text-slate-600"><Minus className="w-3 h-3" /></button>
                                    <span className="w-10 text-center text-sm font-bold text-slate-800">{item.qty}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="p-2 hover:bg-slate-200 rounded-r-lg text-slate-600"><Plus className="w-3 h-3" /></button>
                                </div>
                                
                                {/* Lógica Visual: Si es compra, input costo a la derecha. Si es venta, precio. */}
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-400 uppercase">
                                            {view === 'pos' ? 'Precio' : 'Costo'}
                                    </span>
                                    {view === 'purchases' ? (
                                        <input 
                                            type="text" 
                                            className="w-20 p-1 text-right border border-emerald-300 rounded text-sm font-bold text-emerald-700 bg-emerald-50 focus:ring-2 focus:ring-emerald-500 outline-none"
                                            value={item.transactionPrice === 0 ? '' : '$' + formatMoney(item.transactionPrice)}
                                            placeholder="$0"
                                            onChange={(e) => {
                                                // Eliminar todo lo que no sea dígito para obtener el número puro
                                                const rawValue = e.target.value.replace(/\D/g, '');
                                                const numberValue = parseInt(rawValue, 10) || 0;
                                                updateTransactionPrice(item.id, numberValue);
                                            }}
                                        />
                                    ) : (
                                        <span className="font-bold text-slate-700 min-w-[3rem] text-right">${formatMoney(item.transactionPrice)}</span>
                                    )}
                                </div>
                             </div>
                        </div>
                      ))}
                    </div>

                    {/* Panel de Acciones Compacto */}
                    <div className="shrink-0 p-3 bg-slate-50 space-y-3"> 
                      
                        {/* FILA 1: CLIENTE + MEDIO DE PAGO */}
                        <div className="flex gap-2 items-center">
                            {view === 'pos' ? (
                                <>
                                    {/* SELECTOR DE CLIENTE (Ocupa el espacio restante) */}
                                    <div className="flex-1 relative" ref={clientInputRef}>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Cliente..."
                                                className="w-full h-10 pl-9 text-sm border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={clientSearchTerm}
                                                onChange={(e) => {
                                                    setClientSearchTerm(e.target.value);
                                                    setShowClientOptions(true);
                                                    setSelectedClient(''); 
                                                }}
                                                onFocus={() => setShowClientOptions(true)}
                                            />
                                            <Users className="absolute left-3 top-3 w-4 h-4 text-slate-400"/>
                                            {selectedClient && (
                                                 <div className="absolute right-3 top-3 text-green-500">
                                                    <Check className="w-4 h-4" />
                                                 </div>
                                            )}
                                        </div>
                                        
                                        {/* Lista Sugerencias Cliente */}
                                        {showClientOptions && (
                                            <div className="absolute bottom-full mb-1 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto z-50">
                                                <div 
                                                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 text-sm font-bold text-slate-800"
                                                    onClick={() => {
                                                        setSelectedClient('Consumidor Final');
                                                        setClientSearchTerm('Consumidor Final');
                                                        setShowClientOptions(false);
                                                    }}
                                                >
                                                    Consumidor Final
                                                </div>
                                                {filteredClientsForSearch.map(c => (
                                                    <div 
                                                        key={c.id}
                                                        className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 text-sm"
                                                        onClick={() => {
                                                            setSelectedClient(c.id);
                                                            setClientSearchTerm(c.name);
                                                            setShowClientOptions(false);
                                                        }}
                                                    >
                                                        <div className="font-medium text-slate-700">{c.name}</div>
                                                        {c.department && <div className="text-xs text-slate-400">{c.department}</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* SELECTOR MEDIO PAGO (Al lado del cliente) */}
                                    <select 
                                        value={paymentMethod} 
                                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                                        className={`h-10 text-sm border rounded-xl px-2 outline-none font-medium w-32 ${!paymentMethod ? 'border-red-300 text-slate-500 bg-red-50' : 'border-slate-200 text-slate-800 bg-white'}`}
                                    >
                                        <option value="" disabled>Medio Pago</option>
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Transferencia">Transferencia</option>
                                    </select>

                                    {/* Botón Nuevo Cliente */}
                                    <button onClick={() => setIsClientModalOpen(true)} className="bg-white border border-slate-200 text-blue-600 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                                            <UserPlus className="w-5 h-5" />
                                    </button>
                                </>
                            ) : (
                                <select 
                                    className="flex-1 h-10 text-sm border border-emerald-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none px-2"
                                    value={selectedSupplier}
                                    onChange={(e) => setSelectedSupplier(e.target.value)}
                                >
                                    <option value="">Proveedor *</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            )}
                        </div>
                        
                        {/* Botones de Acción */}
                        <div className="flex gap-2">
                            {/* Botón Resumen WhatsApp (Solo en Venta) */}
                            {view === 'pos' && (
                                <button 
                                    onClick={() => setShowPreTicket(true)}
                                    className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                                >
                                    <FileText className="w-5 h-5" />
                                </button>
                            )}

                            {/* Botón Acción Principal Integrado con Total */}
                            <button 
                                onClick={handleTransaction}
                                disabled={loading}
                                className={`flex-1 h-12 rounded-xl font-bold text-white shadow-lg flex justify-between px-6 items-center active:scale-95 transition-transform
                                ${view === 'purchases' 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' 
                                    : (!paymentMethod ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200')
                                }`}
                            >
                                <span>{view === 'purchases' ? 'Confirmar' : 'Cobrar'}</span>
                                <span className="text-xl">${formatMoney(cartTotal)}</span>
                            </button>
                        </div>
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* VISTA: HISTORIAL DE COMPRAS */}
        {view === 'purchases' && showPurchaseHistory && (
            <div className="p-4 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                      <button onClick={() => setShowPurchaseHistory(false)} className="text-emerald-600 flex items-center gap-1 font-medium text-sm">
                         <ChevronLeft className="w-4 h-4" /> Volver
                      </button>
                      <button onClick={() => setShowPhFilters(!showPhFilters)} className={`p-2 rounded-lg ${showPhFilters ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                         <Filter className="w-5 h-5" />
                      </button>
                </div>

                {showPhFilters && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4 space-y-3 animate-in slide-in-from-top duration-200">
                          <div className="grid grid-cols-2 gap-3">
                            <input type="date" className="w-full p-2 border rounded-lg text-sm" value={phStartDate} onChange={e => setPhStartDate(e.target.value)} />
                            <input type="date" className="w-full p-2 border rounded-lg text-sm" value={phEndDate} onChange={e => setPhEndDate(e.target.value)} />
                        </div>
                        <select className="w-full p-2 border rounded-lg text-sm" value={phSupplier} onChange={e => setPhSupplier(e.target.value)}>
                                 <option value="">Todos los Proveedores</option>
                                 {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input type="text" placeholder="Contiene producto..." className="w-full p-2 border rounded-lg text-sm" value={phProduct} onChange={e => setPhProduct(e.target.value)} />
                        <button onClick={() => { setPhStartDate(''); setPhEndDate(''); setPhSupplier(''); setPhProduct(''); }} className="w-full py-2 text-xs text-red-500 font-medium border border-red-100 rounded-lg hover:bg-red-50">Limpiar</button>
                    </div>
                )}

                <div className="space-y-3">
                    {filteredPurchases.map(t => (
                        <div key={t.id} onClick={() => setReceiptDetails(t)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 active:bg-slate-50 cursor-pointer">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-bold text-slate-800 text-lg">${formatMoney(t.total)}</div>
                                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                        <Briefcase className="w-3 h-3" />
                                        <span className="font-medium">{getSupplierName(t.clientId)}</span>
                                    </div>
                                </div>
                                <div className="px-2 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    Compra
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-2">
                                <div className="text-xs text-slate-400">
                                    {new Date(t.date?.seconds * 1000).toLocaleDateString()} • {t.items.length} items
                                </div>
                                <div className="flex items-center text-emerald-600 text-xs font-medium gap-1">
                                    Ver Detalle <ChevronRight className="w-3 h-3" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* VISTA: INVENTARIO */}
        {view === 'inventory' && (
          <div className="p-4 overflow-y-auto">
            <div className="flex justify-between mb-4 gap-2">
               <div className="flex-1 relative">
                   <input 
                    type="text" 
                    placeholder="Buscar item..." 
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                   />
                   <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400"/>
               </div>
               <button onClick={() => setIsCategoryModalOpen(true)} className="bg-white text-slate-600 px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <Tag className="w-5 h-5" />
               </button>
               {/* BOTÓN NUEVO: ENVIAR CATÁLOGO */}
               <button onClick={() => setShowCatalogModal(true)} className="bg-green-600 text-white px-3 py-2 rounded-xl shadow-sm hover:bg-green-700">
                  <Share2 className="w-5 h-5" />
               </button>
               <button onClick={() => { setEditingProduct(null); setProductPriceInput(''); setIsProductModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-200">
                  <Plus className="w-4 h-4" /> Nuevo
               </button>
            </div>

            {/* FILTRO DE CATEGORIAS (Botones horizontales) */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
                <button 
                    onClick={() => setSelectedCategoryFilter('ALL')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${selectedCategoryFilter === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                    Todos
                </button>
                {categories.map(c => (
                    <button 
                        key={c.id}
                        onClick={() => setSelectedCategoryFilter(c.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${selectedCategoryFilter === c.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            <div className="space-y-3">
              {filteredProducts.map(p => {
                const status = getStockStatus(p.stock);
                return (
                    <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-slate-800">{p.name}</h3>
                            <p className="text-xs text-slate-500 uppercase mb-2">{categories.find(c => c.id === p.category)?.name || p.category}</p>
                            <div className="inline-flex items-center bg-slate-100 px-2 py-1 rounded-lg text-xs font-medium text-slate-600">
                                Venta: <span className="text-slate-900 font-bold ml-1">${formatMoney(p.price)}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className={`text-sm font-bold px-3 py-1 rounded-lg ${status.color}`}>
                                {p.stock} u.
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{status.label}</span>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-slate-50">
                        <button onClick={() => setHistoryProduct(p)} className="flex items-center gap-1 px-3 py-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 text-xs font-bold"><History className="w-4 h-4" /> Historial</button>
                        <button onClick={() => { setEditingProduct(p); setProductPriceInput('$' + formatMoney(p.price)); setIsProductModalOpen(true); }} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"><Users className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    </div>
                );
              })}
              <div className="h-20"></div>
            </div>
          </div>
        )}

        {/* VISTA: RECIBOS */}
        {view === 'receipts' && (
            <div className="p-4 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-lg text-slate-700">Ventas</h2>
                    <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
                {showFilters && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4 space-y-3 animate-in slide-in-from-top duration-200">
                        <div className="grid grid-cols-2 gap-3">
                            <input type="date" className="w-full p-2 border rounded-lg text-sm" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                            <input type="date" className="w-full p-2 border rounded-lg text-sm" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                        </div>
                        <select className="w-full p-2 border rounded-lg text-sm" value={filterClient} onChange={e => setFilterClient(e.target.value)}>
                                 <option value="">Todos los clientes</option>
                                 {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input type="text" placeholder="Producto..." className="w-full p-2 border rounded-lg text-sm" value={filterProduct} onChange={e => setFilterProduct(e.target.value)} />
                        <button onClick={() => { setFilterClient(''); setFilterStartDate(''); setFilterEndDate(''); setFilterProduct(''); }} className="w-full py-2 text-xs text-red-500 font-medium border border-red-100 rounded-lg hover:bg-red-50">Limpiar</button>
                    </div>
                )}
                <div className="space-y-3">
                    {filteredSales.map(t => {
                        const margin = t.totalCost ? t.total - t.totalCost : t.total;
                        const marginPercent = t.total > 0 ? (margin / t.total) * 100 : 0;
                        return (
                            <div key={t.id} onClick={() => setReceiptDetails(t)} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 active:bg-slate-50 cursor-pointer">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="font-bold text-slate-800 text-lg">${formatMoney(t.total)}</div>
                                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                            <Users className="w-3 h-3" />
                                            <span className="font-medium">{getClientName(t.clientId)}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                         <div className={`px-2 py-1 rounded text-xs font-bold border ${marginPercent > 30 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>Mg: {marginPercent.toFixed(0)}%</div>
                                         {t.paymentMethod && (
                                             <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                                 {t.paymentMethod === 'Efectivo' ? <Banknote className="w-3 h-3"/> : <CreditCard className="w-3 h-3"/>}
                                                 {t.paymentMethod}
                                             </div>
                                         )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-50 mt-2">
                                    <div className="text-xs text-slate-400">{new Date(t.date?.seconds * 1000).toLocaleDateString()} • {t.items.length} items</div>
                                    <div className="flex items-center text-blue-600 text-xs font-medium gap-1">Ver Detalle <ChevronRight className="w-3 h-3" /></div>
                                </div>
                            </div>
                        );
                    })}
                    <div className="h-20"></div>
                </div>
            </div>
        )}
        
        {/* VISTA: CLIENTES */}
        {view === 'clients' && ( <div className="p-4 overflow-y-auto"><button onClick={() => setIsClientModalOpen(true)} className="w-full bg-blue-600 text-white p-3 rounded-xl mb-4 font-bold shadow-lg flex justify-center items-center gap-2"><UserPlus className="w-5 h-5" /> Crear Cliente</button><div className="space-y-3">{clients.map(c => (<div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">{c.name.charAt(0)}</div><div><h3 className="font-bold text-slate-800">{c.name}</h3><div className="text-sm text-slate-500 mt-0.5 flex flex-col">{c.department && <span className="font-bold text-slate-700">Depto: {c.department}</span>}{c.phone && <span>{c.phone}</span>}{c.email && <span className="text-xs text-slate-400">{c.email}</span>}</div></div></div>))}</div><div className="h-20"></div></div> )}
        
        {/* VISTA: REPORTES AVANZADOS */}
        {view === 'reports' && (
          <div className="p-4 space-y-5 overflow-y-auto">
              
            {/* BOTONERAS RÁPIDAS */}
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Dashboard</h3>
                <button 
                    onClick={() => setShowStockAlertModal(true)}
                    className="bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
                >
                    <AlertTriangle className="w-4 h-4 text-yellow-400" /> Reporte Stock
                </button>
            </div>

            {/* 1. Botones Rápidos de Fecha */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button onClick={() => setQuickDate('today')} className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold whitespace-nowrap">Hoy</button>
                <button onClick={() => setQuickDate('yesterday')} className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold whitespace-nowrap">Ayer</button>
                <button onClick={() => setQuickDate('week')} className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold whitespace-nowrap">Semana</button>
                <button onClick={() => setQuickDate('month')} className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold whitespace-nowrap">Mes</button>
            </div>

            {/* 2. Filtros de Fecha Globales */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Inicio</label>
                    <input type="date" className="w-full text-sm p-1 bg-slate-50 rounded border-0" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} />
                 </div>
                 <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Fin</label>
                    <input type="date" className="w-full text-sm p-1 bg-slate-50 rounded border-0" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} />
                 </div>
            </div>

            {/* 3. KPIs Principales */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-200">
                <div className="text-blue-200 text-xs font-bold mb-1 uppercase tracking-wider">Ventas Totales</div>
                <div className="text-2xl font-black">${formatMoney(reportData.totalSales)}</div>
              </div>
              <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg shadow-indigo-200">
                <div className="text-indigo-200 text-xs font-bold mb-1 uppercase tracking-wider">Costos (FIFO)</div>
                <div className="text-2xl font-black">${formatMoney(reportData.totalCost)}</div>
              </div>
              <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg shadow-emerald-200">
                <div className="text-emerald-200 text-xs font-bold mb-1 uppercase tracking-wider">Margen $</div>
                <div className="text-2xl font-black">${formatMoney(reportData.margin)}</div>
              </div>
              <div className="bg-white text-emerald-600 p-4 rounded-2xl shadow-lg border border-emerald-100">
                <div className="text-emerald-400 text-xs font-bold mb-1 uppercase tracking-wider">Margen %</div>
                <div className="text-2xl font-black">{reportData.marginPercent.toFixed(1)}%</div>
              </div>
            </div>

            {/* 4. Línea de Tiempo (Tendencia de Ventas) */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-slate-700">Evolución de Ventas</h3>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {reportData.timelineData.length === 0 && <div className="text-xs text-slate-400 text-center py-4">Sin datos en el periodo</div>}
                    {reportData.timelineData.map((d, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs">
                            <span className="w-12 text-slate-500">{d.date}</span>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500 rounded-full" 
                                    style={{ width: `${(d.total / Math.max(...reportData.timelineData.map(x => x.total))) * 100}%` }}
                                ></div>
                            </div>
                            <span className="w-16 text-right font-bold text-slate-700">${formatMoney(d.total)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 5. Ranking Productos */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                 <div className="flex items-center gap-2 mb-4">
                    <Package className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-slate-700">Top 5 Productos</h3>
                </div>
                <div className="space-y-3">
                    {reportData.productRanking.length === 0 && <div className="text-xs text-slate-400 text-center">Sin ventas</div>}
                    {reportData.productRanking.map((p, i) => (
                        <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50 last:border-0 pb-2">
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {i + 1}
                                </div>
                                <div className="font-medium text-slate-700 line-clamp-1">{p.name}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold">${formatMoney(p.revenue)}</div>
                                <div className="text-xs text-slate-400">{p.qty} un. vendidas</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 6. Ranking Clientes */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                 <div className="flex items-center gap-2 mb-4">
                    <Award className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-slate-700">Top 5 Clientes</h3>
                </div>
                <div className="space-y-3">
                    {reportData.clientRanking.length === 0 && <div className="text-xs text-slate-400 text-center">Sin datos</div>}
                    {reportData.clientRanking.map((c, i) => (
                        <div key={i} className="flex justify-between items-center text-sm border-b border-slate-50 last:border-0 pb-2">
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {i + 1}
                                </div>
                                <div className="font-medium text-slate-700">{c.name}</div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold">${c.revenue.toLocaleString()}</div>
                                <div className="text-xs text-slate-400">{c.count} compras</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="h-20"></div>

          </div>
        )}
      </main>

      {/* Modales */}
      {receiptDetails && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md h-[85vh] sm:h-auto sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-slate-500" />
                            Detalle {receiptDetails.type === 'sale' ? 'Venta' : 'Compra'}
                        </h2>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                             {receiptDetails.type === 'sale' ? 'Cliente:' : 'Proveedor:'} 
                             <span className="font-bold text-slate-700">
                                 {receiptDetails.type === 'sale' ? getClientName(receiptDetails.clientId) : getSupplierName(receiptDetails.clientId)}
                             </span>
                        </div>
                        {receiptDetails.paymentMethod && (
                             <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                Pago: <span className="font-bold text-slate-700">{receiptDetails.paymentMethod}</span>
                             </div>
                        )}
                    </div>
                    <button onClick={() => setReceiptDetails(null)} className="bg-white p-2 rounded-full shadow-sm text-slate-500"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                    <div className="text-center mb-6">
                        <div className="text-sm text-slate-500 mb-1">{new Date(receiptDetails.date?.seconds * 1000).toLocaleString()}</div>
                        <div className="text-4xl font-black text-slate-800 tracking-tight">${formatMoney(receiptDetails.total)}</div>
                    </div>
                    <div className="space-y-4">
                        {receiptDetails.items.map((item, idx) => (
                            <div key={idx} className="py-2 border-b border-slate-50 border-dashed">
                                <div className="flex justify-between mb-1">
                                    <div className="font-bold text-slate-700">{item.name}</div>
                                    <div className="font-bold">${formatMoney(item.transactionPrice * item.qty)}</div>
                                </div>
                                <div className="text-xs text-slate-400 mb-2">
                                    {item.qty} u. x ${formatMoney(item.transactionPrice)}
                                </div>
                                {item.fifoDetails && item.fifoDetails.length > 0 && receiptDetails.type === 'sale' && (
                                    <div className="bg-slate-50 p-2 rounded-lg text-[10px]">
                                        <div className="font-bold text-slate-500 mb-1 uppercase tracking-wider">Origen del Costo</div>
                                        {item.fifoDetails.map((detail, dIdx) => (
                                            <div key={dIdx} className="flex justify-between text-slate-600">
                                                <span>• {detail.qty} u. del {new Date(detail.date?.seconds * 1000).toLocaleDateString()}</span>
                                                <span>Costo: ${formatMoney(detail.cost)} c/u</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Modal Pre-Ticket (Resumen WhatsApp) */}
      {showPreTicket && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
             <div className="bg-white w-full max-w-sm h-auto sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
                 <div className="p-4 bg-emerald-600 text-white flex justify-between items-center">
                     <h2 className="font-bold flex items-center gap-2"><MessageCircle className="w-5 h-5" /> Resumen WhatsApp</h2>
                     <button onClick={() => setShowPreTicket(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
                 </div>
                 <div className="p-6 bg-white space-y-4">
                     <div className="text-center">
                         <div className="text-xs text-slate-400 mb-1">Total a Enviar</div>
                         <div className="text-4xl font-black text-slate-800">${formatMoney(cartTotal)}</div>
                         {selectedClient && selectedClient !== 'Consumidor Final' && (
                             <div className="text-sm font-bold text-emerald-600 mt-2 flex items-center justify-center gap-1">
                                 <Users className="w-3 h-3" />
                                 {getClientName(selectedClient)}
                             </div>
                         )}
                     </div>
                     <div className="bg-slate-50 p-3 rounded-xl text-sm text-slate-600 max-h-40 overflow-y-auto">
                         <ul className="list-disc pl-4 space-y-1">
                             {cart.map(item => (
                                 <li key={item.id}>{item.name} (x{item.qty})</li>
                             ))}
                         </ul>
                     </div>
                     <button 
                         onClick={handleWhatsAppShare}
                         className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-600 flex items-center justify-center gap-2"
                     >
                         <Share2 className="w-4 h-4" /> Enviar por WhatsApp
                     </button>
                 </div>
             </div>
         </div>
      )}

      {/* Modal Alerta Stock (WhatsApp a Dueños) */}
      {showStockAlertModal && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                 <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
                     <h2 className="font-bold flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-400" /> Reporte Stock Crítico</h2>
                     <button onClick={() => setShowStockAlertModal(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
                 </div>
                 <div className="p-6 bg-white space-y-4">
                     <p className="text-sm text-slate-600">
                         Esto generará un mensaje de WhatsApp con todos los productos que tienen <b>menos de 4 unidades</b> (Críticos y Bajos).
                     </p>
                     
                     <div className="space-y-3">
                         <div>
                             <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Teléfono Dueño 1</label>
                             <div className="flex gap-2">
                                 <input 
                                     type="tel" 
                                     className="flex-1 border border-slate-200 rounded-lg p-2 text-sm" 
                                     placeholder="56912345678"
                                     value={reportPhones.phone1}
                                     onChange={e => setReportPhones({...reportPhones, phone1: e.target.value})}
                                 />
                                 <button onClick={() => handleSendStockReport(reportPhones.phone1)} className="bg-green-500 text-white p-2 rounded-lg shadow-md active:scale-95 transition-transform">
                                     <Share2 className="w-4 h-4" />
                                 </button>
                             </div>
                         </div>
                         <div>
                             <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Teléfono Dueño 2</label>
                             <div className="flex gap-2">
                                 <input 
                                     type="tel" 
                                     className="flex-1 border border-slate-200 rounded-lg p-2 text-sm" 
                                     placeholder="56912345678"
                                     value={reportPhones.phone2}
                                     onChange={e => setReportPhones({...reportPhones, phone2: e.target.value})}
                                 />
                                 <button onClick={() => handleSendStockReport(reportPhones.phone2)} className="bg-green-500 text-white p-2 rounded-lg shadow-md active:scale-95 transition-transform">
                                     <Share2 className="w-4 h-4" />
                                 </button>
                             </div>
                         </div>
                     </div>
                     
                     <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 text-xs text-yellow-800">
                         <b>Nota:</b> Los números se guardan en este dispositivo para la próxima vez.
                     </div>
                 </div>
             </div>
         </div>
      )}

      {/* MODAL NUEVO: ENVIAR CATÁLOGO */}
      {showCatalogModal && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                 <div className="p-4 bg-green-600 text-white flex justify-between items-center">
                     <h2 className="font-bold flex items-center gap-2"><BookOpen className="w-5 h-5" /> Enviar Catálogo</h2>
                     <button onClick={() => setShowCatalogModal(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
                 </div>
                 <div className="p-6 bg-white space-y-4">
                     <p className="text-sm text-slate-600">
                         Selecciona la categoría para generar el catálogo en WhatsApp (Nombre + Precio).
                     </p>
                     <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                         <button 
                             onClick={() => handleSendCatalog('ALL')}
                             className="w-full py-3 px-4 bg-slate-100 hover:bg-green-50 text-slate-800 font-bold rounded-xl text-left flex justify-between items-center"
                         >
                             Todo el Catálogo <ChevronRight className="w-4 h-4 text-slate-400" />
                         </button>
                         {categories.map(c => (
                             <button 
                                 key={c.id}
                                 onClick={() => handleSendCatalog(c.id)}
                                 className="w-full py-3 px-4 bg-white border border-slate-100 hover:bg-green-50 text-slate-700 font-medium rounded-xl text-left flex justify-between items-center"
                             >
                                 {c.name} <ChevronRight className="w-4 h-4 text-slate-400" />
                             </button>
                         ))}
                     </div>
                 </div>
             </div>
         </div>
      )}

      {/* Modal Producto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-slate-800">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <input name="name" required placeholder="Nombre" defaultValue={editingProduct?.name} className="w-full p-3 border border-slate-200 rounded-xl" />
              
              {/* INPUT PRECIO FORMATEADO */}
              <input 
                name="price" 
                type="text" 
                required 
                placeholder="Precio Venta" 
                value={productPriceInput}
                onChange={(e) => {
                    // 1. Obtener solo números
                    const rawValue = e.target.value.replace(/\D/g, '');
                    // 2. Si está vacío, limpiar estado
                    if (!rawValue) {
                        setProductPriceInput('');
                        return;
                    }
                    // 3. Convertir a número y formatear
                    const numberValue = parseInt(rawValue, 10);
                    setProductPriceInput('$' + formatMoney(numberValue));
                }}
                className="w-full p-3 border border-slate-200 rounded-xl text-slate-700" 
              />

              <select name="category" defaultValue={editingProduct?.category} className="w-full p-3 border border-slate-200 rounded-xl bg-white">
                    <option value="">Seleccionar Categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Categoría */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Nueva Categoría</h2>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); simpleSave('categories', { name: fd.get('name') }, setIsCategoryModalOpen); }}>
              <input name="name" required placeholder="Nombre Categoría" className="w-full p-3 border border-slate-200 rounded-xl" />
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Proveedor */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Nuevo Proveedor</h2>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); simpleSave('suppliers', { name: fd.get('name'), contact: fd.get('contact') }, setIsSupplierModalOpen); }}>
              <input name="name" required placeholder="Razón Social / Nombre" className="w-full p-3 border border-slate-200 rounded-xl mb-3" />
              <input name="contact" placeholder="Contacto (Tel/Email)" className="w-full p-3 border border-slate-200 rounded-xl" />
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cliente */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Nuevo Cliente</h2>
            <form onSubmit={handleSaveClient} className="space-y-4">
              <input name="name" required placeholder="Nombre" className="w-full p-3 border border-slate-200 rounded-xl mb-3" />
              <input name="department" placeholder="Departamento (Ej. 101-A)" className="w-full p-3 border border-slate-200 rounded-xl mb-3" />
              <input name="phone" placeholder="Teléfono" className="w-full p-3 border border-slate-200 rounded-xl" />
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setIsClientModalOpen(false)} className="flex-1 py-3 bg-slate-100 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
        
      {/* Historial Producto */}
      {historyProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md h-[80vh] sm:h-[600px] sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div><h2 className="font-bold text-lg text-slate-800">Historial</h2><p className="text-xs text-slate-500">{historyProduct.name}</p></div>
                    <button onClick={() => setHistoryProduct(null)} className="bg-white p-2 rounded-full shadow-sm text-slate-500"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {transactions.filter(t => t.items.some(i => i.id === historyProduct.id)).map(t => {
                        const item = t.items.find(i => i.id === historyProduct.id);
                        if(!item) return null;
                        return (
                            <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${t.type === 'sale' ? 'bg-green-100 text-green-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {t.type === 'sale' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                                    </div>
                                    <div><div className="font-bold text-sm capitalize">{t.type === 'sale' ? 'Venta' : 'Compra'}</div><div className="text-xs text-slate-400">{new Date(t.date?.seconds * 1000).toLocaleDateString()}</div></div>
                                </div>
                                <div className="text-right"><div className={`font-bold ${t.type === 'sale' ? 'text-red-500' : 'text-green-500'}`}>{t.type === 'sale' ? '-' : '+'}{item.qty} u.</div><div className="text-xs text-slate-500">@ ${formatMoney(item.transactionPrice)}</div></div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
      )}

      {/* Navegación Inferior */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around py-3 pb-safe-bottom z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] shrink-0">
        <NavButton icon={<LayoutDashboard />} label="Dashboard" active={view === 'reports'} onClick={() => setView('reports')} />
        <NavButton icon={<ShoppingCart />} label="Venta" active={view === 'pos'} onClick={() => setView('pos')} />
        <NavButton icon={<Truck />} label="Abastecer" active={view === 'purchases'} onClick={() => { setView('purchases'); setShowPurchaseHistory(false); }} />
        <NavButton icon={<Receipt />} label="Recibos" active={view === 'receipts'} onClick={() => setView('receipts')} />
        <NavButton icon={<Package />} label="Stock" active={view === 'inventory'} onClick={() => setView('inventory')} />
      </nav>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: any) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 ${active ? 'text-blue-600 bg-blue-50 scale-105' : 'text-slate-400 hover:bg-slate-50'}`}>
          {React.cloneElement(icon, { className: `w-6 h-6 ${active ? 'fill-current' : ''}` })}
          <span className="text-[10px] font-bold">{label}</span>
        </button>
    )
}
