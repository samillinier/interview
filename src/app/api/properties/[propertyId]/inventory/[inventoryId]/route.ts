import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { isAdmin } from '@/lib/property-access'

// GET - Get a specific inventory item
export async function GET(
  request: NextRequest,
  { params }: { params: { propertyId: string; inventoryId: string } }
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
    
    const inventoryItem = await prisma.inventory.findUnique({
      where: { id: params.inventoryId },
    })

    if (!inventoryItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    // Admins can access any inventory item
    if (await isAdmin(userEmail)) {
      return NextResponse.json(inventoryItem)
    }
    
    // Other users can only access their own property's inventory items
    const property = await prisma.property.findUnique({
      where: { email: userEmail },
    })

    if (!property || property.id !== params.propertyId || inventoryItem.propertyId !== params.propertyId) {
      return NextResponse.json(
        { error: 'Forbidden - Cannot access other properties' },
        { status: 403 }
      )
    }

    return NextResponse.json(inventoryItem)
  } catch (error: any) {
    console.error('Error fetching inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
      { status: 500 }
    )
  }
}

// PATCH - Update an inventory item
export async function PATCH(
  request: NextRequest,
  { params }: { params: { propertyId: string; inventoryId: string } }
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
    
    const inventoryItem = await prisma.inventory.findUnique({
      where: { id: params.inventoryId },
    })

    if (!inventoryItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    // Admins can update any inventory item
    if (!(await isAdmin(userEmail))) {
      // Other users can only update their own property's inventory
      const property = await prisma.property.findUnique({
        where: { email: userEmail },
      })

      if (!property || property.id !== params.propertyId || inventoryItem.propertyId !== params.propertyId) {
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

    const updatedInventoryItem = await prisma.inventory.update({
      where: { id: params.inventoryId },
      data: {
        ...(itemName !== undefined && { itemName }),
        ...(sku !== undefined && { sku }),
        ...(category !== undefined && { category }),
        ...(quantity !== undefined && { quantity: parseFloat(quantity) }),
        ...(unitOfMeasure !== undefined && { unitOfMeasure }),
        ...(cost !== undefined && { cost: cost ? parseFloat(cost) : null }),
        ...(price !== undefined && { price: price ? parseFloat(price) : null }),
        ...(supplier !== undefined && { supplier }),
        ...(supplierContact !== undefined && { supplierContact }),
        ...(location !== undefined && { location }),
        ...(warehouse !== undefined && { warehouse }),
        ...(reorderLevel !== undefined && { reorderLevel: reorderLevel ? parseFloat(reorderLevel) : null }),
        ...(minimumStock !== undefined && { minimumStock: minimumStock ? parseFloat(minimumStock) : null }),
        ...(maximumStock !== undefined && { maximumStock: maximumStock ? parseFloat(maximumStock) : null }),
        ...(status !== undefined && { status }),
        ...(brand !== undefined && { brand }),
        ...(manufacturer !== undefined && { manufacturer }),
        ...(barcode !== undefined && { barcode }),
        ...(serialNumber !== undefined && { serialNumber }),
        ...(lastRestocked !== undefined && { lastRestocked: lastRestocked ? new Date(lastRestocked) : null }),
        ...(notes !== undefined && { notes }),
      },
    })

    return NextResponse.json(updatedInventoryItem)
  } catch (error: any) {
    console.error('Error updating inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an inventory item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { propertyId: string; inventoryId: string } }
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
    
    const inventoryItem = await prisma.inventory.findUnique({
      where: { id: params.inventoryId },
    })

    if (!inventoryItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      )
    }

    // Admins can delete any inventory item
    if (!(await isAdmin(userEmail))) {
      // Other users can only delete their own property's inventory
      const property = await prisma.property.findUnique({
        where: { email: userEmail },
      })

      if (!property || property.id !== params.propertyId || inventoryItem.propertyId !== params.propertyId) {
        return NextResponse.json(
          { error: 'Forbidden - Cannot access other properties' },
          { status: 403 }
        )
      }
    }

    await prisma.inventory.delete({
      where: { id: params.inventoryId },
    })

    return NextResponse.json({ message: 'Inventory item deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    )
  }
}
