/**
 * CategoryManagementModal Component
 * Admin modal for managing categories and subcategories with drag-and-drop reordering
 * 
 * Extracted from App.jsx as part of refactoring effort
 */

import React, { useState, useEffect } from 'react';
import { X, Edit, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../common';

/**
 * CategoryManagementModal Component
 * 
 * @param {Object} props
 * @param {Object} props.currentUser - Current user object
 * @param {Function} props.onClose - Callback to close modal
 */
export default function CategoryManagementModal({ currentUser, onClose }) {
  const toast = useToast();
  const [allCategories, setAllCategories] = useState([]); // All categories flat
  const [categories, setCategories] = useState([]); // Organized hierarchically
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropIndex, setDropIndex] = useState(null); // Track where item will be dropped
  const [dropPosition, setDropPosition] = useState(null); // 'above' or 'below'
  const [newSubcategoryNames, setNewSubcategoryNames] = useState({}); // { categoryId: name }
  const [addingSubcategory, setAddingSubcategory] = useState({}); // { categoryId: true/false }
  const [expandedCategories, setExpandedCategories] = useState({}); // Track which categories are expanded

  useEffect(() => {
    loadCategories();
  }, []);

  // Organize categories hierarchically
  useEffect(() => {
    if (allCategories.length === 0) {
      setCategories([]);
      return;
    }

    const topLevel = allCategories.filter(c => !c.parent_category_id).sort((a, b) => (a.order || 0) - (b.order || 0));
    const organized = topLevel.map(cat => ({
      ...cat,
      subcategories: allCategories
        .filter(sc => sc.parent_category_id === cat.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
    }));
    setCategories(organized);
  }, [allCategories]);

  async function loadCategories() {
    if (!currentUser?.subspecialtyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Load ALL categories (both top-level and subcategories)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('subspecialty_id', currentUser.subspecialtyId)
        .order('order');

      if (error) throw error;
      setAllCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Error loading categories: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCategory() {
    if (!newCategoryName.trim()) return;

    try {
      setAddingCategory(true);
      const maxOrder = allCategories.filter(c => !c.parent_category_id).length > 0 
        ? Math.max(...allCategories.filter(c => !c.parent_category_id).map(c => c.order || 0)) 
        : 0;

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: newCategoryName.trim(),
          subspecialty_id: currentUser.subspecialtyId,
          parent_category_id: null,
          order: maxOrder + 1,
          depth: 0
        }])
        .select()
        .single();

      if (error) throw error;
      
      setAllCategories([...allCategories, data]);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Error adding category: ' + error.message);
    } finally {
      setAddingCategory(false);
    }
  }

  async function handleAddSubcategory(parentCategoryId) {
    const subcategoryName = newSubcategoryNames[parentCategoryId];
    if (!subcategoryName?.trim()) return;

    try {
      setAddingSubcategory({ ...addingSubcategory, [parentCategoryId]: true });
      const parentSubcategories = allCategories.filter(c => c.parent_category_id === parentCategoryId);
      const maxOrder = parentSubcategories.length > 0 
        ? Math.max(...parentSubcategories.map(c => c.order || 0)) 
        : 0;

      const { data, error } = await supabase
        .from('categories')
        .insert([{
          name: subcategoryName.trim(),
          subspecialty_id: currentUser.subspecialtyId,
          parent_category_id: parentCategoryId,
          order: maxOrder + 1,
          depth: 1
        }])
        .select()
        .single();

      if (error) throw error;
      
      setAllCategories([...allCategories, data]);
      setNewSubcategoryNames({ ...newSubcategoryNames, [parentCategoryId]: '' });
      setExpandedCategories({ ...expandedCategories, [parentCategoryId]: true });
    } catch (error) {
      console.error('Error adding subcategory:', error);
      alert('Error adding subcategory: ' + error.message);
    } finally {
      setAddingSubcategory({ ...addingSubcategory, [parentCategoryId]: false });
    }
  }

  async function handleUpdateCategory(categoryId, newName) {
    if (!newName.trim()) {
      setEditingId(null);
      setEditingName('');
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: newName.trim() })
        .eq('id', categoryId);

      if (error) throw error;

      setAllCategories(allCategories.map(cat => 
        cat.id === categoryId ? { ...cat, name: newName.trim() } : cat
      ));
      setEditingId(null);
      setEditingName('');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Error updating category: ' + error.message);
    }
  }

  async function handleDeleteCategory(categoryId) {
    const category = allCategories.find(c => c.id === categoryId);
    const hasSubcategories = allCategories.some(c => c.parent_category_id === categoryId);
    
    if (hasSubcategories) {
      if (!confirm('This category has subcategories. Deleting it will also delete all subcategories. Are you sure?')) {
        return;
      }
    } else {
      if (!confirm('Are you sure you want to delete this category? This cannot be undone.')) {
        return;
      }
    }

    try {
      // Delete subcategories first if any
      if (hasSubcategories) {
        const { error: subError } = await supabase
          .from('categories')
          .delete()
          .eq('parent_category_id', categoryId);

        if (subError) throw subError;
      }

      // Delete the category
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      setAllCategories(allCategories.filter(cat => cat.id !== categoryId && cat.parent_category_id !== categoryId));
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Error deleting category: ' + error.message);
    }
  }

  async function handleReorder(newOrder) {
    try {
      // Update all categories with new order
      const updates = newOrder.map((cat, index) => ({
        id: cat.id,
        order: index + 1
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('categories')
          .update({ order: update.order })
          .eq('id', update.id);

        if (error) throw error;
      }

      setCategories(newOrder);
    } catch (error) {
      console.error('Error reordering categories:', error);
      toast.error('Error reordering categories: ' + error.message);
      loadCategories(); // Reload on error
    }
  }

  // Handle manual reorder with up/down buttons
  const handleMoveCategory = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    
    const newCategories = [...categories];
    const [removed] = newCategories.splice(index, 1);
    newCategories.splice(targetIndex, 0, removed);
    
    // Update database with new order
    try {
      const updates = newCategories.map((cat, idx) => ({
        id: cat.id,
        order: idx
      }));
      
      for (const update of updates) {
        const { error } = await supabase
          .from('categories')
          .update({ order: update.order })
          .eq('id', update.id);
        
        if (error) throw error;
      }
      
      // Reload categories to get fresh data
      await loadCategories();
      toast.success('Category order updated');
    } catch (error) {
      console.error('Error reordering category:', error);
      toast.error('Error reordering category: ' + error.message);
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedItem === null) {
      setDropIndex(null);
      setDropPosition(null);
      return;
    }

    // Don't show indicator on the item being dragged
    if (draggedItem === index) {
      setDropIndex(null);
      setDropPosition(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const elementMiddle = rect.top + rect.height / 2;
    
    // Determine if dropping above or below based on mouse position
    const position = mouseY < elementMiddle ? 'above' : 'below';
    
    // Calculate the final drop index
    let finalIndex;
    if (position === 'above') {
      // Dropping above this item
      finalIndex = index;
      // If dragging from below, adjust index
      if (draggedItem > index) {
        finalIndex = index;
      }
    } else {
      // Dropping below this item
      finalIndex = index + 1;
      // If dragging from above, adjust index
      if (draggedItem < index) {
        finalIndex = index + 1;
      }
    }
    
    setDropIndex(finalIndex);
    setDropPosition(position);
  };

  const handleDragLeave = () => {
    setDropIndex(null);
    setDropPosition(null);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    if (draggedItem === null) {
      setDropIndex(null);
      setDropPosition(null);
      setDraggedItem(null);
      return;
    }

    // Use dropIndex if set, otherwise use the index from the drop target
    const finalDropIndex = dropIndex !== null ? dropIndex : index;
    
    if (draggedItem === finalDropIndex) {
      setDropIndex(null);
      setDropPosition(null);
      setDraggedItem(null);
      return;
    }

    const newCategories = [...categories];
    const [removed] = newCategories.splice(draggedItem, 1);
    newCategories.splice(finalDropIndex, 0, removed);

    handleReorder(newCategories);
    setDraggedItem(null);
    setDropIndex(null);
    setDropPosition(null);
  };

  if (!currentUser?.subspecialtyId) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="glass rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Category Management</h2>
          <p className="text-gray-600 mb-6">Please select a subspecialty in your profile to manage categories.</p>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium"
            aria-label="Close category management modal"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-slide-up">
      <div className="glass rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Categories</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">Add, rename, delete, and reorder categories and subcategories</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close category management modal"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Add New Category */}
        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-800">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Add New Category</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder="Category name..."
              className="flex-1 px-4 py-2 border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
            />
            <button
              onClick={handleAddCategory}
              disabled={addingCategory || !newCategoryName.trim()}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingCategory ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>

        {/* Categories List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 mx-auto border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No categories yet. Add one above!</p>
          </div>
        ) : (
          <div className="space-y-2 pl-12">
            {categories.map((category, index) => (
              <div key={category.id} className="space-y-2">
                {/* Drop indicator line above this category */}
                {dropIndex === index && dropPosition === 'above' && draggedItem !== null && draggedItem !== index && (
                  <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-4 shadow-lg animate-pulse mb-2"></div>
                )}
                
                {/* Category */}
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border-2 transition-all ${
                    draggedItem === index 
                      ? 'opacity-50 border-purple-400 scale-95' 
                      : (dropIndex === index && dropPosition === 'above') || (dropIndex === index + 1 && dropPosition === 'below')
                      ? 'border-purple-400 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                  }`}
                >
                  <GripVertical size={20} className="text-gray-400 dark:text-gray-500 cursor-move" />
                  
                  {editingId === category.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => handleUpdateCategory(category.id, editingName)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateCategory(category.id, editingName);
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                          setEditingName('');
                        }
                      }}
                      autoFocus
                      className="flex-1 px-3 py-2 border-2 border-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none"
                    />
                  ) : (
                    <span className="flex-1 text-gray-900 dark:text-white font-medium">{category.name}</span>
                  )}

                  <div className="flex items-center gap-2">
                    {/* Up/Down Arrow Buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveCategory(index, 'up');
                        }}
                        disabled={index === 0}
                        className="p-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-purple-50 hover:border-purple-500 dark:hover:bg-purple-900/30 transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:border-gray-300 dark:disabled:hover:bg-gray-700"
                        title="Move up"
                        aria-label="Move category up"
                      >
                        <ChevronUp size={14} className="text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveCategory(index, 'down');
                        }}
                        disabled={index === categories.length - 1}
                        className="p-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-purple-50 hover:border-purple-500 dark:hover:bg-purple-900/30 transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:border-gray-300 dark:disabled:hover:bg-gray-700"
                        title="Move down"
                        aria-label="Move category down"
                      >
                        <ChevronDown size={14} className="text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setExpandedCategories({
                          ...expandedCategories,
                          [category.id]: !expandedCategories[category.id]
                        });
                      }}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title={expandedCategories[category.id] ? "Collapse" : "Expand"}
                      aria-label={expandedCategories[category.id] ? "Collapse category" : "Expand category"}
                    >
                      {expandedCategories[category.id] ? (
                        <span className="text-xs">▼</span>
                      ) : (
                        <span className="text-xs">▶</span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(category.id);
                        setEditingName(category.name);
                      }}
                      className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                      title="Rename"
                      aria-label={`Rename category: ${category.name}`}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Delete"
                      aria-label={`Delete category: ${category.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Drop indicator line below this category */}
                {dropIndex === index + 1 && dropPosition === 'below' && draggedItem !== null && draggedItem !== index && (
                  <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-4 shadow-lg animate-pulse mt-2"></div>
                )}

                {/* Subcategories */}
                {expandedCategories[category.id] && (
                  <div className="ml-8 space-y-2">
                    {category.subcategories && category.subcategories.length > 0 && (
                      category.subcategories.map((subcategory, subIndex) => (
                        <div
                          key={subcategory.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <span className="text-xs text-gray-400">└─</span>
                          {editingId === subcategory.id ? (
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onBlur={() => handleUpdateCategory(subcategory.id, editingName)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleUpdateCategory(subcategory.id, editingName);
                                } else if (e.key === 'Escape') {
                                  setEditingId(null);
                                  setEditingName('');
                                }
                              }}
                              autoFocus
                              className="flex-1 px-3 py-2 border-2 border-purple-500 rounded-lg focus:outline-none text-sm"
                            />
                          ) : (
                            <span className="flex-1 text-gray-800 text-sm">{subcategory.name}</span>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingId(subcategory.id);
                                setEditingName(subcategory.name);
                              }}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                              title="Rename"
                              aria-label={`Rename subcategory: ${subcategory.name}`}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(subcategory.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                              aria-label={`Delete subcategory: ${subcategory.name}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {/* Add Subcategory Input */}
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSubcategoryNames[category.id] || ''}
                          onChange={(e) => setNewSubcategoryNames({
                            ...newSubcategoryNames,
                            [category.id]: e.target.value
                          })}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddSubcategory(category.id)}
                          placeholder="Add subcategory..."
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                        />
                        <button
                          onClick={() => handleAddSubcategory(category.id)}
                          disabled={addingSubcategory[category.id] || !newSubcategoryNames[category.id]?.trim()}
                          className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {addingSubcategory[category.id] ? '...' : 'Add'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
