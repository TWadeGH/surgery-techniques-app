import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

export default function ContentBrowser({ profile }) {
  const [currentView, setCurrentView] = useState('specialties') // specialties, subspecialties, categories, procedures, resources
  const [breadcrumbs, setBreadcrumbs] = useState([])
  const [specialties, setSpecialties] = useState([])
  const [subspecialties, setSubspecialties] = useState([])
  const [categories, setCategories] = useState([])
  const [procedures, setProcedures] = useState([])
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)

  // Current selection IDs
  const [selectedSpecialty, setSelectedSpecialty] = useState(null)
  const [selectedSubspecialty, setSelectedSubspecialty] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedProcedure, setSelectedProcedure] = useState(null)

  useEffect(() => {
    loadSpecialties()
  }, [])

  async function loadSpecialties() {
    setLoading(true)
    const { data } = await supabase
      .from('specialties')
      .select('*')
      .order('order')
    
    if (data) {
      setSpecialties(data)
    }
    setLoading(false)
  }

  async function loadSubspecialties(specialtyId, specialtyName) {
    setLoading(true)
    const { data } = await supabase
      .from('subspecialties')
      .select('*')
      .eq('specialty_id', specialtyId)
      .order('order')
    
    if (data) {
      setSubspecialties(data)
      setSelectedSpecialty(specialtyId)
      setCurrentView('subspecialties')
      setBreadcrumbs([{ label: specialtyName, onClick: () => goToSpecialties() }])
    }
    setLoading(false)
  }

  async function loadCategories(subspecialtyId, subspecialtyName) {
    setLoading(true)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('subspecialty_id', subspecialtyId)
      .is('parent_category_id', null) // Top-level categories only
      .order('order')
    
    if (data) {
      setCategories(data)
      setSelectedSubspecialty(subspecialtyId)
      setCurrentView('categories')
      setBreadcrumbs([
        ...breadcrumbs,
        { label: subspecialtyName, onClick: () => goToSubspecialties() }
      ])
    }
    setLoading(false)
  }

  async function loadSubcategories(parentCategoryId, categoryName) {
    setLoading(true)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_category_id', parentCategoryId)
      .order('order')
    
    if (data && data.length > 0) {
      // Has subcategories - show them
      setCategories(data)
      setSelectedCategory(parentCategoryId)
      setBreadcrumbs([
        ...breadcrumbs,
        { label: categoryName, onClick: () => goToCategories() }
      ])
    } else {
      // No subcategories - load procedures for this category
      loadProcedures(parentCategoryId, categoryName)
    }
    setLoading(false)
  }

  async function loadProcedures(categoryId, categoryName) {
    setLoading(true)
    const { data } = await supabase
      .from('procedures')
      .select('*')
      .eq('category_id', categoryId)
      .order('name')
    
    if (data) {
      setProcedures(data)
      setSelectedCategory(categoryId)
      setCurrentView('procedures')
      setBreadcrumbs([
        ...breadcrumbs,
        { label: categoryName, onClick: () => goToCategories() }
      ])
    }
    setLoading(false)
  }

  async function loadResources(procedureId, procedureName) {
    setLoading(true)
    const { data } = await supabase
      .from('resources')
      .select(`
        *
      `)
      .eq('procedure_id', procedureId)
      .order('is_featured', { ascending: false })
      .order('view_count', { ascending: false })
    
    if (data) {
      setResources(data)
      setSelectedProcedure(procedureId)
      setCurrentView('resources')
      setBreadcrumbs([
        ...breadcrumbs,
        { label: procedureName, onClick: () => goToProcedures() }
      ])
    }
    setLoading(false)
  }

  function goToSpecialties() {
    setCurrentView('specialties')
    setBreadcrumbs([])
    setSelectedSpecialty(null)
    setSelectedSubspecialty(null)
    setSelectedCategory(null)
    setSelectedProcedure(null)
  }

  function goToSubspecialties() {
    setCurrentView('subspecialties')
    setBreadcrumbs(breadcrumbs.slice(0, 1))
    setSelectedSubspecialty(null)
    setSelectedCategory(null)
    setSelectedProcedure(null)
  }

  function goToCategories() {
    setCurrentView('categories')
    // Keep first 2 breadcrumbs (specialty, subspecialty)
    setBreadcrumbs(breadcrumbs.slice(0, 2))
    setSelectedCategory(null)
    setSelectedProcedure(null)
    loadCategories(selectedSubspecialty, breadcrumbs[1].label)
  }

  function goToProcedures() {
    setCurrentView('procedures')
    // Keep appropriate breadcrumbs based on depth
    setBreadcrumbs(breadcrumbs.slice(0, -1))
    setSelectedProcedure(null)
    loadProcedures(selectedCategory, breadcrumbs[breadcrumbs.length - 1].label)
  }

  const styles = {
    container: {
      padding: '20px',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    },
    innerContainer: {
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: 'white',
      padding: '30px',
      borderRadius: '12px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    breadcrumbs: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '30px',
      fontSize: '14px',
      color: '#666'
    },
    breadcrumbLink: {
      color: '#0066cc',
      cursor: 'pointer',
      textDecoration: 'none'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      marginBottom: '30px',
      color: '#1a1a1a'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '20px'
    },
    card: {
      padding: '24px',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      border: '2px solid #e0e0e0',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#1a1a1a',
      marginBottom: '8px'
    },
    cardDescription: {
      fontSize: '14px',
      color: '#666',
      lineHeight: '1.5'
    },
    emptyState: {
      textAlign: 'center',
      padding: '60px 20px',
      color: '#999'
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.innerContainer}>
          <div style={{ textAlign: 'center', padding: '60px' }}>
            Loading...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.innerContainer}>
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <div style={styles.breadcrumbs}>
            <span 
              style={styles.breadcrumbLink}
              onClick={goToSpecialties}
            >
              Home
            </span>
            {breadcrumbs.map((crumb, index) => (
              <span key={index}>
                <span> / </span>
                <span 
                  style={styles.breadcrumbLink}
                  onClick={crumb.onClick}
                >
                  {crumb.label}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Specialties View */}
        {currentView === 'specialties' && (
          <>
            <h1 style={styles.title}>Select a Specialty</h1>
            <div style={styles.grid}>
              {specialties.map(specialty => (
                <div
                  key={specialty.id}
                  style={styles.card}
                  onClick={() => loadSubspecialties(specialty.id, specialty.name)}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                >
                  <div style={styles.cardTitle}>{specialty.name}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Subspecialties View */}
        {currentView === 'subspecialties' && (
          <>
            <h1 style={styles.title}>Select a Subspecialty</h1>
            <div style={styles.grid}>
              {subspecialties.map(subspecialty => (
                <div
                  key={subspecialty.id}
                  style={styles.card}
                  onClick={() => loadCategories(subspecialty.id, subspecialty.name)}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                >
                  <div style={styles.cardTitle}>{subspecialty.name}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Categories View */}
        {currentView === 'categories' && (
          <>
            <h1 style={styles.title}>Select a Category</h1>
            {categories.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No categories yet. Check back soon!</p>
              </div>
            ) : (
              <div style={styles.grid}>
                {categories.map(category => (
                  <div
                    key={category.id}
                    style={styles.card}
                    onClick={() => loadSubcategories(category.id, category.name)}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                  >
                    <div style={styles.cardTitle}>{category.name}</div>
                    {category.description && (
                      <div style={styles.cardDescription}>{category.description}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Procedures View */}
        {currentView === 'procedures' && (
          <>
            <h1 style={styles.title}>Select a Procedure</h1>
            {procedures.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No procedures yet. Check back soon!</p>
              </div>
            ) : (
              <div style={styles.grid}>
                {procedures.map(procedure => (
                  <div
                    key={procedure.id}
                    style={styles.card}
                    onClick={() => loadResources(procedure.id, procedure.name)}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                  >
                    <div style={styles.cardTitle}>{procedure.name}</div>
                    {procedure.description && (
                      <div style={styles.cardDescription}>{procedure.description}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Resources View */}
        {currentView === 'resources' && (
          <>
            <h1 style={styles.title}>Resources</h1>
            {resources.length === 0 ? (
              <div style={styles.emptyState}>
                <p>No resources yet. Check back soon!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {resources.map(resource => (
                  <div
                    key={resource.id}
                    style={{
                      padding: '24px',
                      backgroundColor: resource.is_featured ? '#fff8e1' : '#f8f9fa',
                      borderRadius: '12px',
                      border: resource.is_featured ? '2px solid #ffc107' : '2px solid #e0e0e0'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                          <h3 style={{ margin: 0, fontSize: '20px', color: '#1a1a1a' }}>
                            {resource.title}
                          </h3>
                          {resource.is_featured && (
                            <span style={{ 
                              padding: '4px 8px', 
                              backgroundColor: '#ffc107', 
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              FEATURED
                            </span>
                          )}
                          {resource.is_recommended && (
                            <span style={{ 
                              padding: '4px 8px', 
                              backgroundColor: '#4caf50', 
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              RECOMMENDED
                            </span>
                          )}
                          {resource.is_sponsored && (
                            <span style={{ 
                              padding: '4px 8px', 
                              backgroundColor: '#9e9e9e', 
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              Sponsored
                            </span>
                          )}
                        </div>
                        {resource.description && (
                          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>
                            {resource.description}
                          </p>
                        )}
                        <div style={{ fontSize: '13px', color: '#999' }}>
                          Type: {resource.resource_type} • Views: {resource.view_count} • Favorites: {resource.favorite_count}
                        </div>
                      </div>
                      <a 
                        href={resource.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          padding: '10px 20px',
                          backgroundColor: '#0066cc',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          marginLeft: '20px'
                        }}
                      >
                        View Resource →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
