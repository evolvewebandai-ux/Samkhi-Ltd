import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { 
  Search, 
  Star, 
  Trash2, 
  Check, 
  User, 
  Clock, 
  SlidersHorizontal,
  ChevronRight,
  CheckCircle2,
  X,
  MessageSquare,
  ShoppingBag,
  Plus,
  Calendar,
  AlertTriangle,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { showToast } from '../../lib/toast';

export interface Review {
  id: string;
  productId: string;
  productName: string;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAt: string;
  verifiedPurchase?: boolean;
}

const ratingFilterOptions = [
  { value: 'All', label: 'All Ratings' },
  { value: '5', label: '5 Stars ⭐⭐⭐⭐⭐' },
  { value: '4', label: '4 Stars ⭐⭐⭐⭐' },
  { value: '3', label: '3 Stars ⭐⭐⭐' },
  { value: '2', label: '2 Stars ⭐⭐' },
  { value: '1', label: '1 Star ⭐' }
];

const purchaseFilterOptions = [
  { value: 'All', label: 'All Purchases' },
  { value: 'verified', label: 'Verified Only' },
  { value: 'unverified', label: 'Unverified Only' }
];

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [purchaseFilter, setPurchaseFilter] = useState('All');
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  
  // Edit states in details inspector
  const [editName, setEditName] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [editVerified, setEditVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  // Synchronize reviews from Firestore in real-time
  useEffect(() => {
    const q = query(collection(db, 'product_reviews'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Review[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          ...data
        } as Review);
      });
      setReviews(list);
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to product_reviews stream:", error);
      showToast("Failed to sync customer reviews feedback channel.", "error");
      handleFirestoreError(error, OperationType.GET, 'product_reviews');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const selectedReview = reviews.find(r => r.id === selectedReviewId);

  // Keep inspector editable states synchronized
  useEffect(() => {
    if (selectedReview) {
      setEditName(selectedReview.reviewerName || '');
      setEditRating(selectedReview.rating || 5);
      setEditComment(selectedReview.comment || '');
      setEditVerified(!!selectedReview.verifiedPurchase);
    } else {
      setEditName('');
      setEditRating(5);
      setEditComment('');
      setEditVerified(false);
    }
  }, [selectedReviewId, selectedReview?.id]);

  const handleUpdateReview = async () => {
    if (!selectedReviewId || !selectedReview) return;
    if (!editComment.trim()) {
      showToast("Review comments cannot be blank.", "warning");
      return;
    }
    setIsSaving(true);
    try {
      const reviewRef = doc(db, 'product_reviews', selectedReviewId);
      await updateDoc(reviewRef, {
        reviewerName: editName.trim() || 'Anonymous Customer',
        rating: Number(editRating),
        comment: editComment.trim(),
        verifiedPurchase: editVerified
      });
      showToast("Product review modified and updated successfully!", "success");
    } catch (err: any) {
      console.error("Error updating product review:", err);
      showToast("Failed to save review details.", "error");
      handleFirestoreError(err, OperationType.UPDATE, `product_reviews/${selectedReviewId}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteDoc(doc(db, 'product_reviews', reviewId));
      showToast("Customer review deleted permanently.", "success");
      if (selectedReviewId === reviewId) {
        setSelectedReviewId(null);
      }
      setDeletingReviewId(null);
    } catch (err: any) {
      console.error("Error deleting review:", err);
      showToast("Failed to remove product review.", "error");
      handleFirestoreError(err, OperationType.DELETE, `product_reviews/${reviewId}`);
    }
  };

  // Filter reviews
  const filteredReviews = reviews.filter((r) => {
    const matchesSearch = 
      r.reviewerName.toLowerCase().includes(search.toLowerCase()) ||
      r.productName.toLowerCase().includes(search.toLowerCase()) ||
      r.comment.toLowerCase().includes(search.toLowerCase());

    const matchesRating = ratingFilter === 'All' || String(r.rating) === ratingFilter;
    const matchesPurchase = 
      purchaseFilter === 'All' || 
      (purchaseFilter === 'verified' && r.verifiedPurchase) || 
      (purchaseFilter === 'unverified' && !r.verifiedPurchase);

    return matchesSearch && matchesRating && matchesPurchase;
  });

  // Dynamic analytic calculations
  const { avgRating, ratingCounts } = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (reviews.length === 0) return { avgRating: 0, ratingCounts: counts };

    let sum = 0;
    reviews.forEach((r) => {
      sum += r.rating;
      const rate = Math.round(r.rating) as 5 | 4 | 3 | 2 | 1;
      if (counts[rate] !== undefined) {
        counts[rate]++;
      }
    });

    return {
      avgRating: parseFloat((sum / reviews.length).toFixed(1)),
      ratingCounts: counts
    };
  }, [reviews]);

  return (
    <div id="reviews-container" className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest font-black text-amber-600 block mb-1">Moderation Hub</span>
          <h1 className="text-2xl font-black text-[#1E293B] flex items-center gap-2 font-display">
            <MessageSquare size={26} className="text-amber-500" />
            Product Reviews Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Audit customer expressions, sanitize review content guidelines, and curate verified e-commerce store feedback.
          </p>
        </div>
        <div className="bg-white px-4 py-2 border border-[#e3e3e3] rounded-lg text-xs font-semibold text-[#1e1e1e] shadow-sm flex items-center gap-2 font-mono">
          <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping border border-white shrink-0" />
          {reviews.length} FEEDBACKS COLLECTED
        </div>
      </div>

      {/* Overview Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Scorecard */}
        <div className="bg-white border border-[#e3e3e3] rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Average Feedback Rating</h3>
            <div className="flex items-baseline gap-2 mt-4">
              <span className="text-5xl font-black text-[#1e293b] font-display">{avgRating}</span>
              <span className="text-slate-400 text-sm font-bold font-sans">/ 5.0</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500 font-semibold font-sans">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={14} 
                  className={cn(
                    "fill-current",
                    i < Math.round(avgRating) ? "text-amber-400" : "text-slate-200"
                  )} 
                />
              ))}
            </div>
            <span>Global store index (based on {reviews.length} reviews)</span>
          </div>
        </div>

        {/* Breakdown bar graph */}
        <div className="bg-white border border-[#e3e3e3] rounded-xl p-5 shadow-sm md:col-span-2 space-y-2.5">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">Rating Distribution Breakdown</h3>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = ratingCounts[stars as 5|4|3|2|1] || 0;
            const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (
              <div key={stars} className="flex items-center gap-3 text-xs font-bold text-slate-600">
                <span className="w-14 text-slate-400 font-medium whitespace-nowrap flex items-center gap-0.5">{stars} Star</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-400 rounded-full transition-all duration-500" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-10 text-right text-slate-400 font-mono text-[11px]">{count} ({Math.round(percentage)}%)</span>
              </div>
            );
          })}
        </div>

      </div>

      {/* Main Core Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Master Table/List */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Search, filters, controls */}
          <div className="bg-white border border-[#e3e3e3] rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* SearchBar */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter product title, reviewer metadata, comment text..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-xs font-medium outline-none focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/5 transition-all text-[#1a1a1a]"
                />
                {search && (
                  <button 
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filters toggle */}
              <div className="flex gap-2 shrink-0">
                <select 
                  value={ratingFilter}
                  onChange={e => setRatingFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#333] outline-none cursor-pointer focus:bg-white focus:border-amber-500 transition-all font-sans"
                >
                  {ratingFilterOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>

                <select 
                  value={purchaseFilter}
                  onChange={e => setPurchaseFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#333] outline-none cursor-pointer focus:bg-white focus:border-amber-500 transition-all font-sans"
                >
                  {purchaseFilterOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Table Container Cards List */}
          <div className="bg-white border border-[#e3e3e3] rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Syncing Firestore Reviews Feed...</p>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="py-24 text-center max-w-md mx-auto space-y-4 px-4">
                <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 mx-auto">
                  <SlidersHorizontal size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-700 text-base">No Matching Reviews</h3>
                  <p className="text-xs text-slate-500 mt-1 font-sans">
                    No active product reviews match your configuration search terms or filtered thresholds.
                  </p>
                </div>
                {(search || ratingFilter !== 'All' || purchaseFilter !== 'All') && (
                  <button 
                    onClick={() => {
                      setSearch('');
                      setRatingFilter('All');
                      setPurchaseFilter('All');
                    }}
                    className="px-4 py-2 border border-[#e3e3e3] text-[#1a1a1a] hover:bg-zinc-50 rounded-lg font-bold text-xs tracking-wide active:scale-95 transition-all"
                  >
                    Reset Filter Query
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#e3e3e3] text-[10px] font-black text-[#616161] uppercase tracking-wider font-mono">
                      <th className="px-5 py-3.5">Reviewer</th>
                      <th className="px-5 py-3.5">Product Name</th>
                      <th className="px-5 py-3.5">Score</th>
                      <th className="px-5 py-3.5">Feedback Sneak</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f1f1]">
                    {filteredReviews.map((review) => {
                      const isChosen = selectedReviewId === review.id;
                      return (
                        <tr 
                          key={review.id}
                          className={cn(
                            "group hover:bg-[#fafafa] cursor-pointer transition-colors text-xs text-[#1e1e1e]",
                            isChosen ? "bg-amber-50/40 hover:bg-amber-50/65" : ""
                          )}
                          onClick={() => setSelectedReviewId(review.id)}
                        >
                          {/* Reviewer Profile */}
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              {review.reviewerName || 'Anonymous'}
                              {review.verifiedPurchase && (
                                <span title="Verified Customer">
                                  <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono tracking-tight block mt-0.5">
                              {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Unknown Date'}
                            </span>
                          </td>

                          {/* Product Spec */}
                          <td className="px-5 py-4 max-w-[140px] truncate">
                            <span className="font-semibold text-slate-600 flex items-center gap-1 truncate" title={review.productName}>
                              <ShoppingBag size={11} className="text-slate-400 shrink-0" />
                              {review.productName}
                            </span>
                          </td>

                          {/* Stars Score */}
                          <td className="px-5 py-4">
                            <div className="flex text-amber-400">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={11} 
                                  className={cn("fill-current", i < review.rating ? "text-amber-400" : "text-slate-200")} 
                                />
                              ))}
                            </div>
                          </td>

                          {/* Comment draft snippet */}
                          <td className="px-5 py-4 max-w-[180px] truncate">
                            <p className="text-slate-500 font-medium truncate" title={review.comment}>
                              {review.comment}
                            </p>
                          </td>

                          {/* Trigger Panel Side */}
                          <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => setSelectedReviewId(review.id)}
                                className="p-1 px-2 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                                title="View details"
                              >
                                <ChevronRight size={16} />
                              </button>
                              <button 
                                onClick={() => setDeletingReviewId(review.id)}
                                className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                                title="Delete review"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Detail Moderator Sidebar */}
        <div id="inspector-card" className="space-y-4">
          <AnimatePresence mode="wait">
            {!selectedReview ? (
              <motion.div 
                key="empty-inspector"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white border border-[#e3e3e3] rounded-xl p-8 text-center text-slate-500 shadow-sm align-middle h-full flex flex-col justify-center py-24"
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto mb-4">
                  <Star size={20} className="text-slate-400" />
                </div>
                <h4 className="font-bold text-slate-700 text-sm">Review Audit panel</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  Select any review from the dashboard list to inspect core comments, adjust ratings, enable or disable user flags, or purge records.
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key={selectedReview.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white border border-[#e3e3e3] rounded-xl shadow-sm overflow-hidden flex flex-col h-full font-sans"
              >
                {/* Header Profile Title */}
                <div className="p-5 border-b border-[#f1f1f1] bg-slate-50 flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] uppercase font-bold tracking-wider">
                      ID: {selectedReview.id.substring(0, 8)}...
                    </span>
                    <h3 className="font-black text-slate-800 text-base">Modify Review</h3>
                    <div className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">{selectedReview.productName}</div>
                  </div>
                  <button 
                    onClick={() => setSelectedReviewId(null)}
                    className="p-1 hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 rounded-full transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Editable review field list */}
                <div className="p-5 space-y-5 overflow-y-auto">
                  
                  {/* Scope */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-[#f1f1f1] pb-1.5 flex items-center gap-1.5">
                      <ShoppingBag size={12} /> Target Product Name
                    </h4>
                    <p className="text-xs font-bold text-slate-700 font-sans leading-relaxed">
                      {selectedReview.productName}
                    </p>
                  </div>

                  {/* Edit Section */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-[#f1f1f1] pb-1.5 flex items-center gap-1.5">
                      <Edit2 size={12} /> Moderation Fields
                    </h4>
                    
                    {/* Reviewer Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-slate-400 block">Reviewer Name</label>
                      <input 
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="John Doe..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:bg-white focus:border-amber-500 font-medium text-slate-700"
                      />
                    </div>

                    {/* Score select */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-slate-400 block">Assigned Score Rating</label>
                      <select 
                        value={editRating}
                        onChange={e => setEditRating(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:bg-white focus:border-amber-500 font-medium text-slate-700"
                      >
                        <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                        <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                        <option value="3">⭐⭐⭐ 3 Stars</option>
                        <option value="2">⭐⭐ 2 Stars</option>
                        <option value="1">⭐ 1 Star</option>
                      </select>
                    </div>

                    {/* Verified Customer Status */}
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-3">
                      <div>
                        <span className="text-[11px] font-extrabold text-slate-700 block">Verified Purchase</span>
                        <span className="text-[9px] text-slate-400 font-medium block">Confirm reviewer bought this product</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={editVerified}
                        onChange={e => setEditVerified(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>

                    {/* Review Comment detail */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-slate-400 block">Review Comment Body</label>
                      <textarea 
                        rows={4}
                        value={editComment}
                        onChange={e => setEditComment(e.target.value)}
                        placeholder="Review comments text..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:bg-white focus:border-amber-500 font-semibold leading-relaxed text-slate-700 resize-none"
                      />
                    </div>
                  </div>

                  {/* Submission triggers */}
                  <div className="space-y-2 pt-2">
                    <button 
                      onClick={handleUpdateReview}
                      disabled={isSaving || (
                        editComment.trim() === selectedReview.comment &&
                        editName.trim() === selectedReview.reviewerName &&
                        editRating === selectedReview.rating &&
                        editVerified === !!selectedReview.verifiedPurchase
                      )}
                      className={cn(
                        "w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center justify-center gap-1.5 font-bold text-xs tracking-wider uppercase transition-all shadow active:scale-95",
                        (
                          editComment.trim() === selectedReview.comment &&
                          editName.trim() === selectedReview.reviewerName &&
                          editRating === selectedReview.rating &&
                          editVerified === !!selectedReview.verifiedPurchase
                        ) ? "opacity-40 cursor-not-allowed bg-slate-300 shadow-none hover:bg-slate-300 text-white" : ""
                      )}
                    >
                      {isSaving ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                          Saving changes...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={13} />
                          Apply Moderation
                        </>
                      )}
                    </button>

                    <button 
                      onClick={() => setDeletingReviewId(selectedReview.id)}
                      className="w-full py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-600 hover:text-white flex items-center justify-center gap-2 font-bold text-xs tracking-wider uppercase transition-colors"
                    >
                      <Trash2 size={13} />
                      Purge Feedback Document
                    </button>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Delete Review Modal Confirmation Overlay */}
      <AnimatePresence>
        {deletingReviewId && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingReviewId(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white border border-[#e3e3e3] rounded-lg shadow-xl z-[60] overflow-hidden p-6 text-center font-sans"
            >
              <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
                <Trash2 size={22} />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Purge Customer Review?</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Are you absolutely sure you want to permanently delete this customer review? This content will be completely removed from the online product website.
              </p>
              
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setDeletingReviewId(null)}
                  className="flex-1 py-2 px-4 border border-[#e3e3e3] rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => deletingReviewId && handleDeleteReview(deletingReviewId)}
                  className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 active:scale-95 transition-all shadow"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
