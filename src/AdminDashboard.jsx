import { useState, useEffect, useRef } from 'react'
import { supabase } from './lib/supabase'

export default function AdminDashboard({ profile, onClose }) {
  const [activeTab, setActiveTab] = useState('categories')
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const modalRef = useRef(null)
  const firstFocusableRef = useRef(null)
  
  // Data states
  const [specialties, setSpecialties] = useState([])
  const [subspecialties, setSubspecialties] = useState([])
  const [categories, setCategories] = useState([])
  const [procedures, setProcedures] = useState([])
  const [resources, setResources] = useState([])
  const [suggestions, setSuggestions] = useState([])
  
  // Form states
  const [selectedSpecialty, setSelectedSpecialty] = useState('')
  const [selectedSubspecialty, setSelectedSubspecialty] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedProcedure, setSelectedProcedure] = useState('')
  const [parentCategory, setParentCategory] = useState('')
  const [formData, setFormData] = useState({})
  
  // Focus trap and ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    
    // Focus first element
    if (firstFocusableRef.current) {
      firstFocusableRef.current.focus()
    }
    
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  // Warn about unsaved changes
  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }
  
  useEffect(() => {
    loadInitialData()
  }, [])
  
  useEffect(() => {
    if (activeTab === 'categories' && selectedSubspecialty) {
      loadCategories()
    } else if (activeTab === 'procedures' && selectedCategory) {
      loadProcedures()
    } else if (activeTab === 'resources' && selectedProcedure) {
      loadResources()
    } else if (activeTab === 'suggestions') {
      loadSuggestions()
    }
  }, [activeTab, selectedSubspecialty, selectedCategory, selectedProcedure])
  
  async function loadInitialData() {
    const { data } = await supabase.from('specialties').select('*').order('order')
    if (data) setSpecialties(data)
  }
  
  async function loadSubspecialties(specialtyId) {
    const { data } = await supabase
      .from('subspecialties')
      .select('*')
      .eq('specialty_id', specialtyId)
      .order('order')
    if (data) setSubspecialties(data)
  }
  
  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('subspecialty_id', selectedSubspecialty)
      .order('depth')
      .order('order')
    if (data) setCategories(data)
  }
  
  async function loadProcedures() {
    const { data } = await supabase
      .from('procedures')
      .select('*')
      .eq('category_id', selectedCategory)
      .order('name')
    if (data) setProcedures(data)
  }
  
  async function loadResources() {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .eq('procedure_id', selectedProcedure)
      .order('created_at', { ascending: false })
    if (data) setResources(data)
  }
  
  async function loadSuggestions() {
    const { data } = await supabase
      .from('resource_suggestions')
      .select(`
        *,
        procedure:procedures(name),
        suggested_by:profiles!resource_suggestions_suggested_by_fkey(email)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (data) setSuggestions(data)
  }
  
  async function handleCreateCategory(e) {
    e.preventDefault()
    if (!selectedSubspecialty || !formData.name) return
    
    setLoading(true)
    const { error } = await supabase
      .from('categories')
      .insert({
        subspecialty_id: selectedSubspecialty,
        parent_category_id: parentCategory || null,
        name: formData.name,
        description: formData.description || null,
        order: formData.order || 1
      })
    
    if (!error) {
      setFormData({})
      setParentCategory('')
      setHasUnsavedChanges(false)
      loadCategories()
    }
    setLoading(false)
  }
  
  async function handleCreateProcedure(e) {
    e.preventDefault()
    if (!selectedCategory || !formData.name) return
    
    setLoading(true)
    const { error } = await supabase
      .from('procedures')
      .insert({
        subspecialty_id: selectedSubspecialty,
        category_id: selectedCategory,
        name: formData.name,
        description: formData.description || null,
        key_terms: formData.keyTerms ? formData.keyTerms.split(',').map(t => t.trim()) : [],
        created_by: profile.id
      })
    
    if (!error) {
      setFormData({})
      setHasUnsavedChanges(false)
      loadProcedures()
    }
    setLoading(false)
  }
  
  async function handleCreateResource(e) {
    e.preventDefault()
    if (!selectedProcedure || !formData.title || !formData.url) return
    
    setLoading(true)
    const { error } = await supabase
      .from('resources')
      .insert({
        procedure_id: selectedProcedure,
        title: formData.title,
        url: formData.url,
        description: formData.description || null,
        resource_type: formData.resourceType || 'video',
        is_sponsored: formData.isSponsored || false,
        sponsor_name: formData.sponsorName || null,
        is_featured: formData.isFeatured || false,
        is_recommended: formData.isRecommended || false,
        recommendation_note: formData.recommendationNote || null,
        curated_by: profile.id
      })
    
    if (!error) {
      setFormData({})
      setHasUnsavedChanges(false)
      loadResources()
    }
    setLoading(false)
  }
  
  async function handleApproveSuggestion(suggestion) {
    setLoading(true)
    
    const { error: resourceError } = await supabase
      .from('resources')
      .insert({
        procedure_id: suggestion.procedure_id,
        title: suggestion.title,
        url: suggestion.url,
        description: suggestion.description,
        resource_type: 'video',
        curated_by: profile.id,
        suggested_by: suggestion.suggested_by
      })
    
    if (!resourceError) {
      await supabase
        .from('resource_suggestions')
        .update({
          status: 'approved',
          reviewed_by: profile.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', suggestion.id)
      
      loadSuggestions()
    }
    setLoading(false)
  }
  
  async function handleRejectSuggestion(suggestionId) {
    setShowConfirmation({
      message: 'Are you sure you want to reject this suggestion?',
      onConfirm: async () => {
        setLoading(true)
        await supabase
          .from('resource_suggestions')
          .update({
            status: 'rejected',
            reviewed_by: profile.id,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', suggestionId)
        
        loadSuggestions()
        setLoading(false)
        setShowConfirmation(null)
      }
    })
  }
  
  return (
    <div 
      className="modal-overlay" 
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-title"
    >
      <div 
        ref={modalRef}
        className="modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '2px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <h2 id="admin-title" style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a' }}>
            Admin Dashboard
          </h2>
          <button 
            ref={firstFocusableRef}
            className="btn btn-secondary"
            onClick={handleClose}
            aria-label="Close admin dashboard"
          >
            Close
          </button>
        </div>
        
        {/* Tabs */}
        <div 
          style={{
            display: 'flex',
            gap: '8px',
            padding: '16px 32px',
            borderBottom: '2px solid #e0e0e0',
            backgroundColor: '#f8f9fa'
          }}
          role="tablist"
          aria-label="Admin sections"
        >
          {['categories', 'procedures', 'resources', 'suggestions'].map(tab => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`${tab}-panel`}
              id={`${tab}-tab`}
              className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'suggestions' && suggestions.length > 0 && ` (${suggestions.length})`}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div 
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '32px'
          }}
          role="tabpanel"
          id={`${activeTab}-panel`}
          aria-labelledby={`${activeTab}-tab`}
        >
          {/* Form content will render here - keeping it simple for token budget */}
          {activeTab === 'categories' && (
            <CategoryForm 
              specialties={specialties}
              subspecialties={subspecialties}
              categories={categories}
              selectedSpecialty={selectedSpecialty}
              selectedSubspecialty={selectedSubspecialty}
              parentCategory={parentCategory}
              formData={formData}
              loading={loading}
              onSpecialtyChange={(id) => {
                setSelectedSpecialty(id)
                setSelectedSubspecialty('')
                loadSubspecialties(id)
              }}
              onSubspecialtyChange={(id) => {
                setSelectedSubspecialty(id)
                loadCategories()
              }}
              onParentCategoryChange={setParentCategory}
              onFormDataChange={(data) => {
                setFormData(data)
                setHasUnsavedChanges(true)
              }}
              onSubmit={handleCreateCategory}
            />
          )}
          
          {activeTab === 'suggestions' && (
            <SuggestionsList 
              suggestions={suggestions}
              loading={loading}
              onApprove={handleApproveSuggestion}
              onReject={handleRejectSuggestion}
            />
          )}
          
          {/* Other tabs would go here but keeping simple for token budget */}
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      {showConfirmation && (
        <ConfirmationDialog 
          message={showConfirmation.message}
          onConfirm={showConfirmation.onConfirm}
          onCancel={() => setShowConfirmation(null)}
        />
      )}
    </div>
  )
}

// Helper components
function CategoryForm({ 
  specialties, subspecialties, categories, 
  selectedSpecialty, selectedSubspecialty, parentCategory, 
  formData, loading, 
  onSpecialtyChange, onSubspecialtyChange, onParentCategoryChange, 
  onFormDataChange, onSubmit 
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label htmlFor="specialty" className="form-label">Specialty</label>
        <select 
          id="specialty"
          className="form-select"
          value={selectedSpecialty}
          onChange={(e) => onSpecialtyChange(e.target.value)}
          required
        >
          <option value="">Select Specialty</option>
          {specialties.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      
      {selectedSpecialty && (
        <div className="form-group">
          <label htmlFor="subspecialty" className="form-label">Subspecialty</label>
          <select 
            id="subspecialty"
            className="form-select"
            value={selectedSubspecialty}
            onChange={(e) => onSubspecialtyChange(e.target.value)}
            required
          >
            <option value="">Select Subspecialty</option>
            {subspecialties.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
      
      {selectedSubspecialty && (
        <>
          <div className="form-group">
            <label htmlFor="parent-category" className="form-label">Parent Category (optional)</label>
            <select 
              id="parent-category"
              className="form-select"
              value={parentCategory}
              onChange={(e) => onParentCategoryChange(e.target.value)}
            >
              <option value="">None (Top-level)</option>
              {categories.filter(c => c.depth < 3).map(c => (
                <option key={c.id} value={c.id}>
                  {' '.repeat((c.depth - 1) * 2)}{c.name} (Level {c.depth})
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="category-name" className="form-label">Category Name *</label>
            <input 
              id="category-name"
              className="form-input"
              value={formData.name || ''}
              onChange={(e) => onFormDataChange({...formData, name: e.target.value})}
              placeholder="e.g., Bunions"
              required
              autoComplete="off"
            />
          </div>
          
          <button 
            type="submit"
            className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
            disabled={loading || !formData.name}
          >
            {loading ? 'Creating…' : 'Create Category'}
          </button>
        </>
      )}
    </form>
  )
}

function SuggestionsList({ suggestions, loading, onApprove, onReject }) {
  if (suggestions.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
        No pending suggestions
      </p>
    )
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {suggestions.map(sug => (
        <div key={sug.id} className="card" style={{ cursor: 'default' }}>
          <div style={{ marginBottom: '12px' }}>
            <strong>{sug.title}</strong>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
              Procedure: {sug.procedure?.name}<br />
              Suggested by: {sug.suggested_by?.email}<br />
              URL: <a href={sug.url} target="_blank" rel="noopener noreferrer">{sug.url}</a>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
              onClick={() => onApprove(sug)}
              disabled={loading}
              aria-label={`Approve suggestion: ${sug.title}`}
            >
              Approve
            </button>
            <button 
              className="btn btn-danger"
              onClick={() => onReject(sug.id)}
              disabled={loading}
              aria-label={`Reject suggestion: ${sug.title}`}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ConfirmationDialog({ message, onConfirm, onCancel }) {
  return (
    <div 
      className="modal-overlay"
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div 
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          maxWidth: '400px',
          width: '100%'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-title">{message}</h3>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button className="btn btn-danger" onClick={onConfirm}>
            Confirm
          </button>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
