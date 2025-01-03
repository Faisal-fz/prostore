'use server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { formatError } from '../utils';
import { cartItemSchema, insertCartSchema } from '../validator';
import { prisma } from '@/db/prisma';
import {CartItem} from '@/types';
import { convertToPlainObject } from '../utils';
import { round2 } from '../utils';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

const calcPrice = (items: z.infer<typeof cartItemSchema>[]) => {
  const itemsPrice = round2(
      items.reduce((acc, item) => acc + Number(item.price) * item.qty, 0)
    ),
    shippingPrice = round2(itemsPrice > 100 ? 0 : 10),
    taxPrice = round2(0.15 * itemsPrice),
    totalPrice = round2(itemsPrice + shippingPrice + taxPrice);
  return {
    itemsPrice: itemsPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    taxPrice: taxPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
};
// Add item to cart in database

export const addItemToCart = async (data: CartItem) => {
  try {
    // Check for cart cookie
    const sessionCartId = (await cookies()).get('sessionCartId')?.value;
    if (!sessionCartId) throw new Error('Cart session not found');

    // Get session and user ID
    const session = await auth();
    const userId = session?.user?.id ? (session.user.id as string) : undefined;

    // Get cart
    const cart = await getMyCart();

    // Parse and validate item
    const item = cartItemSchema.parse(data);

    // Find product in database
    const product = await prisma.product.findFirst({
      where: { id: item.productId },
    });
    if (!product) throw new Error('Product not found');
    if(!cart){
      // Create new cart object
  const newCart = insertCartSchema.parse({
    userId: userId,
    items: [item],
    sessionCartId: sessionCartId,
    ...calcPrice([item]),
  });
  await prisma.cart.create({
    data: newCart,
  });

  // Revalidate product page
  revalidatePath(`/product/${product.slug}`);

  return {
    success: true,
    message: 'Item added to cart successfully',
  };
}else{
  const existItem = (cart.items as CartItem[]).find((x) => x.productId === item.productId);
  console.log(existItem);
  if(existItem){
    if(product.stock< existItem.qty+1){
      throw new Error('Product out of stock');
    }
    (cart.items as CartItem[]).find(
      (x) => x.productId === item.productId
    )!.qty = existItem.qty + 1;
  }else {
    // If stock, add item to cart
    if (product.stock < 1) throw new Error('Not enough stock');
    cart.items.push(item);
  }
  // Save to database
  await prisma.cart.update({
    where: { id: cart.id },
    data: {
      items: cart.items as Prisma.CartUpdateitemsInput[],
      ...calcPrice(cart.items as CartItem[]),
    },
  });
  revalidatePath(`/product/${product.slug}`);

  return {
    success: true,
    message: `${product.name} ${
      existItem ? 'updated in' : 'added to'
    } cart successfully`,
  };
}
} catch (error) {
    console.error('Error adding item to cart:', error);
    return { success: false, message: formatError(error) };
  }
};

//  Get user cart from database
export async function getMyCart() {
  // Check for session cart cookie
  const sessionCartId = (await cookies()).get('sessionCartId')?.value;
  if (!sessionCartId) return undefined;

  // Get session and user ID
  const session = await auth();
  const userId = session?.user?.id ? (session.user.id as string) : undefined;

  // Get user cart from database
  const cart = await prisma.cart.findFirst({
    where: userId ? { userId: userId } : { sessionCartId: sessionCartId },
  });

  if (!cart) return undefined;

  // Convert Decimal values to strings for compatibility with AddToCart component
  return convertToPlainObject({
    ...cart,
    items: cart.items as CartItem[],
    itemsPrice: cart.itemsPrice.toString(),
    totalPrice: cart.totalPrice.toString(),
    shippingPrice: cart.shippingPrice.toString(),
    taxPrice: cart.taxPrice.toString(),
  });
}

// Remove item from cart in database
export async function removeItemFromCart (productId: string) {
  try {
    // Get session cart id
    const sessionCartId = (await cookies()).get('sessionCartId')?.value;
    if (!sessionCartId) throw new Error('Cart Session not found');

    // Get product
    const product = await prisma.product.findFirst({
      where: { id: productId },
    });
    if (!product) throw new Error('Product not found');

    // Get user cart
    const cart = await getMyCart();
    if (!cart) throw new Error('Cart not found');

    // Check if cart has item
    const exist = (cart.items as CartItem[]).find(
      (x) => x.productId === productId
    );
    if (!exist) throw new Error('Item not found');

    // Check if cart has only one item
    if (exist.qty === 1) {
      // Remove item from cart
      cart.items = (cart.items as CartItem[]).filter(
        (x) => x.productId !== exist.productId
      );
    } else {
      // Decrease quantity of existing item
      (cart.items as CartItem[]).find((x) => x.productId === productId)!.qty =
        exist.qty - 1;
    }

    // Update cart in database
    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        items: cart.items as Prisma.CartUpdateitemsInput[],
        ...calcPrice(cart.items as CartItem[]),
      },
    });

    // Revalidate product page
    revalidatePath(`/product/${product.slug}`);

    return {
      success: true,
      message: `${product.name}  ${
        (cart.items as CartItem[]).find((x) => x.productId === productId)
          ? 'updated in'
          : 'removed from'
      } cart successfully`,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
};