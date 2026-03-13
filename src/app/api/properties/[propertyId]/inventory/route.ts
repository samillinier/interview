import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { isAdmin } from '@/lib/property-access'

// GET - Get all inventory items for a property
export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email.toLowerCase()
    
    // Admins can see all inventory
    if (await isAdmin(userEmail)) {
      const inventory = await prisma.inventory.findMany({
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json({ inventory })
    }
    
    // Other users can only see their own property's inventory
    const property = await prisma.property.findUnique({
      where: { email: userEmail },
    })

    if (!property || property.id !== params.propertyId) {
      return NextResponse.json(
        { error: 'Forbidden - Cannot access other properties' },
        { status: 403 }
      )
    }

    const inventory = await prisma.inventory.findMany({
      where: { propertyId: params.propertyId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ inventory })
  } catch (error: any) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

// POST - Create a new inventory item
export async function POST(
  request: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userEmail = session.user.email.toLowerCase()
    
    // Admins can create inventory items for any property
    const isUserAdmin = await isAdmin(userEmail)
    
    if (!isUserAdmin) {
      // Non-admin users can only create inventory items for their own property
      const property = await prisma.property.findUnique({
        where: { email: userEmail },
      })

      if (!property || property.id !== params.propertyId) {
        return NextResponse.json(
          { error: 'Forbidden - Cannot access other properties' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const {
      itemName,
      sku,
      category,
      quantity,
      unitOfMeasure,
      cost,
      price,
      supplier,
      supplierContact,
      location,
      warehouse,
      reorderLevel,
      minimumStock,
      maximumStock,
      status,
      brand,
      manufacturer,
      barcode,
      serialNumber,
      lastRestocked,
      notes,
    } = body

    const inventoryItem = await prisma.inventory.create({
      data: {
        propertyId: params.propertyId,
        itemName,
        sku,
        category,
        quantity: quantity ? parseFloat(quantity) : 0,
        unitOfMeasure: unitOfMeasure || 'unit',
        cost: cost ? parseFloat(cost) : null,
        price: price ? parseFloat(price) : null,
        supplier,
        supplierContact,
        location,
        warehouse,
        reorderLevel: reorderLevel ? parseFloat(reorderLevel) : null,
        minimumStock: minimumStock ? parseFloat(minimumStock) : null,
        maximumStock: maximumStock ? parseFloat(maximumStock) : null,
        status: status || 'active',
        brand,
        manufacturer,
        barcode,
        serialNumber,
        lastRestocked: lastRestocked ? new Date(lastRestocked) : null,
        notes,
      },
    })

    return NextResponse.json(inventoryItem, { status: 201 })
  } catch (error: any) {
    console.error('Error creating inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    )
  }
}
