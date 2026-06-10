import React from "react";
import "./ProductCard.css";

export default function ProductCard({ image, title, price, onView }) {
  return (
    <div className="inseller-product-card">
      <div className="product-media">
        <img src={image} alt={title} className="product-image" />
      </div>

      <div className="product-body">
        <div className="product-title" title={title}>
          {title}
        </div>

        <div className="product-price">{price}</div>

        <button className="product-btn" onClick={onView}>
          View Product
        </button>
      </div>
    </div>
  );
}
