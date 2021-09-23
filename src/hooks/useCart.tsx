import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const item = cart.find(item => item.id === productId);

      if (item) {
        const { data } = await api.get(`/stock/${productId}`);
        const hasStock = item?.amount < data.amount;
        if (!hasStock) throw new Error('qtd');
        item.amount += 1;
        const newItem = {
          productId: item.id,
          amount: item.amount
        }
        updateProductAmount(newItem);
      } else {
        const response = await api.get(`products/${productId}`);
        const stock = await api.get(`/stock/${productId}`);
        if (stock.data.amount < 1) {
          throw new Error('qtd');
        }
        const newCart = cart;
        newCart.push({
          ...response.data,
          amount: 1,
        });
        setCart([]);
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
      }
    } catch (err: any) {
      if (err.message === 'qtd') {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        toast.error('Erro na adição do produto')
      }
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);
      const newCart = cart.filter(product => product.id !== productId);
      if (!product)
        throw new Error();
      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw new Error();
      }

      const stock = await api.get(`/stock/${productId}`);
      if (stock.data.amount < amount) {
        throw new Error('qtd');
      } else {
        const newCart = cart.map(product => {
          if (product.id === productId) {
            product.amount = amount;
          }
          return product;
        })
        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      }

    } catch (err: any) {
      if (err.message === 'qtd')
        toast.error('Quantidade solicitada fora de estoque')
      else
        toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
